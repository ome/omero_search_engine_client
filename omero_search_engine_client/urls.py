
from django.urls import path

from . import views

urlpatterns = [
    # index 'home page' of the omero_search_ening_client app
    path('', views.index, name='omero_search_ening_client'),
]
