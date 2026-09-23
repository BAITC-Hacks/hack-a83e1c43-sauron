from django.contrib import admin

from .models import BusinessTask, Proposal, TeamProfile


@admin.register(BusinessTask)
class BusinessTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "industry", "score", "readiness_level", "status", "updated_at")
    list_filter = ("status", "readiness_level", "industry")
    search_fields = ("title", "draft_text", "context", "need")
    readonly_fields = ("score", "readiness_level", "created_at", "updated_at")


@admin.register(TeamProfile)
class TeamProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name", "interests", "skills", "technologies")


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ("task", "team", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("idea", "plan", "team__name", "task__title")
