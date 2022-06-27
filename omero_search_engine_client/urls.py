from django.conf.urls import url

from . import views

urlpatterns = [
    # index 'home page' of the omero_search_engine_client app
    url(r'^$', views.index, name="omero_search_engine_client"),

    # minimal search form, using external API only
    url(r'^searchform/$', views.index, {"template": "omero_search_engine_client/searchform.html"},
        name="omero_search_engine_form"),
]
