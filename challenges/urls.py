from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BusinessTaskViewSet,
    ProposalViewSet,
    TeamProfileViewSet,
    analyze_task,
    health_check,
)


router = DefaultRouter()
router.register("tasks", BusinessTaskViewSet, basename="task")
router.register("teams", TeamProfileViewSet, basename="team")
router.register("proposals", ProposalViewSet, basename="proposal")

urlpatterns = [
    path("health/", health_check, name="health"),
    path("tasks/analyze/", analyze_task, name="analyze-task"),
    path("", include(router.urls)),
]
