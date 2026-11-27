
from django.urls import path

from . import views

urlpatterns = [
    # index 'home page' of the omero_search_engine_client app
    path('', views.index, name='omero_search_engine_client'),

    path('search', views.handle_search,
        name="omero_searchengine_search",
    ),
]
