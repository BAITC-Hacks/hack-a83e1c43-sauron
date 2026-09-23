from rest_framework import serializers

from .models import BusinessTask, Proposal, TeamProfile
from .scoring import calculate_readiness


class TaskSerializer(serializers.ModelSerializer):
    readiness = serializers.SerializerMethodField()

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "score",
            "readiness_level",
            "published_at",
            "created_at",
            "updated_at",
            "readiness",
        ]

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
    draft_text = serializers.CharField(min_length=10)


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
