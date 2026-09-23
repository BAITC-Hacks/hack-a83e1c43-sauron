from django.contrib import admin
from django.urls import include, path
from django.views.generic import TemplateView
from django.views.decorators.csrf import ensure_csrf_cookie


urlpatterns = [
    path("", ensure_csrf_cookie(TemplateView.as_view(template_name="index.html")), name="frontend"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("challenges.urls")),
]
