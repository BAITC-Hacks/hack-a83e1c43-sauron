from rest_framework import serializers

from .models import BusinessTask, Proposal, TeamProfile
from .scoring import calculate_readiness


class TaskSerializer(serializers.ModelSerializer):
    readiness = serializers.SerializerMethodField()
    confirmed = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = BusinessTask
        fields = [
            "id",
            "title",
            "draft_text",
            "industry",
            "context",
            "need",
            "users",
            "data",
            "constraints",
            "expected_result",
            "success_criteria",
            "business_contact",
            "interaction_format",
            "score",
            "readiness_level",
            "status",
            "published_at",
            "readiness",
            "confirmed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "score",
            "readiness_level",
            "status",
            "published_at",
            "created_at",
            "updated_at",
            "readiness",
        ]

    def validate(self, attrs):
        if "status" in self.initial_data:
            raise serializers.ValidationError({"status": "Статус меняется только через публикацию с подтверждением."})
        title = attrs.get("title", getattr(self.instance, "title", ""))
        draft = attrs.get("draft_text", getattr(self.instance, "draft_text", ""))
        if not title.strip() and not draft.strip():
            raise serializers.ValidationError({"title": "Добавьте название или исходное описание задачи."})
        changed = self.instance and any(
            getattr(self.instance, key) != value
            for key, value in attrs.items() if key != "confirmed"
        )
        if changed and self.instance.status == BusinessTask.Status.PUBLISHED:
            if self.initial_data.get("confirmed") is not True:
                raise serializers.ValidationError({"confirmed": "Подтвердите изменения опубликованной карточки: confirmed=true."})
            if not title.strip():
                raise serializers.ValidationError({"title": "У опубликованной задачи должно быть название."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("confirmed", None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("confirmed", None)
        return super().update(instance, validated_data)

    def get_readiness(self, obj):
        values = {field: getattr(obj, field) for field in {
            "context",
            "need",
            "data",
            "expected_result",
            "success_criteria",
            "constraints",
            "users",
            "business_contact",
            "interaction_format",
        }}
        return calculate_readiness(values)


class AnalyzeTaskSerializer(serializers.Serializer):
    draft_text = serializers.CharField(min_length=10, max_length=12000)
    card = serializers.DictField(
        child=serializers.CharField(allow_blank=True, max_length=12000), required=False, default=dict,
    )

    def validate_card(self, value):
        from .services.ai import QUESTION_FIELDS

        if set(value) - set(QUESTION_FIELDS):
            raise serializers.ValidationError("Передайте только поля карточки задачи.")
        return value


class CatalogFilterSerializer(serializers.Serializer):
    include_drafts = serializers.BooleanField(required=False, default=False)
    industry = serializers.CharField(required=False, allow_blank=True, max_length=100)
    readiness_level = serializers.ChoiceField(
        choices=["draft", "working", "ready", "priority"], required=False, allow_blank=True,
    )
    min_score = serializers.IntegerField(required=False, min_value=0, max_value=100)
    max_score = serializers.IntegerField(required=False, min_value=0, max_value=100)

    def validate(self, attrs):
        if attrs.get("min_score", 0) > attrs.get("max_score", 100):
            raise serializers.ValidationError("Минимальный рейтинг не может быть больше максимального.")
        return attrs


class TeamProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamProfile
        fields = ["id", "name", "interests", "skills", "technologies", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProposalSerializer(serializers.ModelSerializer):
    team_details = TeamProfileSerializer(source="team", read_only=True)
    task_id = serializers.PrimaryKeyRelatedField(source="task", read_only=True)

    class Meta:
        model = Proposal
        fields = [
            "id",
            "task_id",
            "team",
            "team_details",
            "idea",
            "plan",
            "timeline",
            "prototype_url",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "task_id", "team_details", "status", "created_at", "updated_at"]


class ProposalDecisionSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=[Proposal.Status.ACCEPTED, Proposal.Status.REJECTED])
