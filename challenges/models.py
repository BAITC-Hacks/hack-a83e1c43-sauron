from django.db import models

from .scoring import SCORING_RULES, calculate_readiness


class BusinessTask(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликована"
        CLOSED = "closed", "Закрыта"

    title = models.CharField(max_length=200, blank=True)
    draft_text = models.TextField(blank=True)
    industry = models.CharField(max_length=100, blank=True)
    context = models.TextField(blank=True)
    need = models.TextField(blank=True)
    users = models.TextField(blank=True)
    data = models.TextField(blank=True)
    constraints = models.TextField(blank=True)
    expected_result = models.TextField(blank=True)
    success_criteria = models.TextField(blank=True)
    business_contact = models.CharField(max_length=200, blank=True)
    interaction_format = models.CharField(max_length=200, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    readiness_level = models.CharField(max_length=20, default="draft")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-score", "-created_at")

    def save(self, *args, **kwargs):
        values = {
            field: getattr(self, field)
            for rule in SCORING_RULES
            for field in rule["fields"]
        }
        result = calculate_readiness(values)
        self.score = result["score"]
        self.readiness_level = result["level"]

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            kwargs["update_fields"] = set(update_fields) | {"score", "readiness_level", "updated_at"}
        super().save(*args, **kwargs)


class TeamProfile(models.Model):
    name = models.CharField(max_length=120)
    interests = models.TextField(blank=True)
    skills = models.TextField(blank=True)
    technologies = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("name",)


class Proposal(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "На рассмотрении"
        ACCEPTED = "accepted", "Принято"
        REJECTED = "rejected", "Отклонено"

    task = models.ForeignKey(BusinessTask, on_delete=models.CASCADE, related_name="proposals")
    team = models.ForeignKey(TeamProfile, on_delete=models.CASCADE, related_name="proposals")
    idea = models.TextField()
    plan = models.TextField()
    timeline = models.CharField(max_length=200)
    prototype_url = models.URLField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
