from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import BusinessTask, Proposal, TeamProfile
from .serializers import (
    AnalyzeTaskSerializer,
    ProposalDecisionSerializer,
    ProposalSerializer,
    TaskSerializer,
    TeamProfileSerializer,
)
from .services.ai import generate_clarifying_questions


@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok", "service": "hackalem-ai-backend"})


@api_view(["POST"])
def analyze_task(request):
    serializer = AnalyzeTaskSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        result = generate_clarifying_questions(serializer.validated_data["draft_text"])
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)


class BusinessTaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    queryset = BusinessTask.objects.all()
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "list" and self.request.query_params.get("include_drafts") != "true":
            queryset = queryset.filter(status=BusinessTask.Status.PUBLISHED)

        industry = self.request.query_params.get("industry")
        readiness_level = self.request.query_params.get("readiness_level")
        min_score = self.request.query_params.get("min_score")
        max_score = self.request.query_params.get("max_score")
        if industry:
            queryset = queryset.filter(industry__iexact=industry)
        if readiness_level:
            queryset = queryset.filter(readiness_level=readiness_level)
        if min_score:
            queryset = queryset.filter(score__gte=min_score)
        if max_score:
            queryset = queryset.filter(score__lte=max_score)
        return queryset.order_by("-score", "-created_at")

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        task = self.get_object()
        if request.data.get("confirmed") is not True:
            return Response(
                {"detail": "Перед публикацией требуется ручное подтверждение: confirmed=true."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = BusinessTask.Status.PUBLISHED
        task.published_at = timezone.now()
        task.save(update_fields=["status", "published_at"])
        return Response(TaskSerializer(task).data)

    @action(detail=True, methods=["get", "post"], url_path="proposals")
    def proposals(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            return Response(ProposalSerializer(task.proposals.select_related("team"), many=True).data)

        if task.status != BusinessTask.Status.PUBLISHED:
            return Response(
                {"detail": "Отклик можно отправить только на опубликованную задачу."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ProposalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proposal = serializer.save(task=task)
        return Response(ProposalSerializer(proposal).data, status=status.HTTP_201_CREATED)


class TeamProfileViewSet(viewsets.ModelViewSet):
    queryset = TeamProfile.objects.all()
    serializer_class = TeamProfileSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]


class ProposalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Proposal.objects.select_related("task", "team").all()
    serializer_class = ProposalSerializer

    @action(detail=True, methods=["post"])
    def decision(self, request, pk=None):
        proposal = self.get_object()
        serializer = ProposalDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        proposal.status = serializer.validated_data["decision"]
        proposal.save(update_fields=["status", "updated_at"])
        return Response(ProposalSerializer(proposal).data)
