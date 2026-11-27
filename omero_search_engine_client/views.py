
from django.http import HttpResponse
from django.shortcuts import render
import json
import requests
from omeroweb.webclient.decorators import login_required, render_response

from .app_data import get_help_file_contenets
from . import search_engine_settings as settings

# Previously: e.g. omero.web.searchengine.url=https://idr.openmicroscopy.org/searchengine/api/v1
# NOW
# omero config set omero.web.searchengine.url http://134.36.5.37/searchengine

operator_choices=[("equals", "equals"), ("not_equals", "not equals"), ("contains", "contains")
        , ("not_contains", "not contains")]


@login_required()
def index(request, conn=None,**kwargs):
    """
    Home page shows a list of groups OR a set of 'categories' from
    user-configured queries.
    """
    SERVER = settings.SEARCH_ENGINE_URL
    if SERVER is None:
        return HttpResponse("Need to set omero.web.searchengine.url. e.g. https://my-server/searchengine")

    # NB: settings already adds '/' to the SERVER
    SEARCH_ENGINE_URL = f"{SERVER}api/v1/"
    session_id = conn._getSessionId()
    auth_url = f"{SERVER}auth/login"
    check_token = f"{SERVER}auth/verify_token/"

    data = {"session_id": session_id, "data_source": "nightshade"}
    response = requests.post(auth_url, json=data)
    # extract the token from the response
    jwt_token = response.json()["token"]

    # create the Authorization to be sent with each request
    # to allow the user to search the data
    head = {
        "Authorization": f"Bearer {jwt_token}",
        "Content-Type": "application/json",
    }
    # list available data sources
    response = requests.get(f"{SERVER}/searchengine/api/v1/resources/data_sources/", headers=head)
    # {"idr":{"Public":true},"nightshade":{"Public":false}}
    print("Available data sources:", response.text)

    response = requests.get(check_token, headers=head)
    # {"nightshade":{"data_source":"nightshade",
    # "is_admin":false,"is_expired":false,"is_valid":true,
    # "user_groups":{"1102":{"name":"PUBLIC"},"3":{"name":"Swedlow Lab"},"4":{"name":"Swedlow Lab OMERO"}},"user_id":16}}
    print(response.text)

    context = {
        "session_id": session_id,
        "jwt_token": jwt_token,
        "search_engine_url": SEARCH_ENGINE_URL,
        "operator_choices": operator_choices,
        "task_id": "None",
        "help_contents": get_help_file_contenets(),
        "mode": "usesearchterms"
    }
    
    return render(request, "omero_search_engine_client/main_page.html", context)

@login_required()
@render_response()
def handle_search(request, conn=None, **kwargs):

    # Temp: use hardcoded server URL for now
    SERVER = "https://idr.openmicroscopy.org/searchengine/"

    # response = requests.get(f"{SERVER}/searchengine/api/v1/resources/data_sources/")
    # data_sources = response.json()

    search_query = request.GET.get("search_query", "")
    # needed by the base template
    active_group = request.session.get("active_group") or conn.getEventContext().groupId
    context = {
        "search_engine_url": f"{SERVER}api/v1/",
        "active_group": {'id': active_group},
        "search_query": search_query,
        "help_contents": get_help_file_contenets(),
        "template": "omero_search_engine_client/webclient_based/search.html"
    }
    
    return context
