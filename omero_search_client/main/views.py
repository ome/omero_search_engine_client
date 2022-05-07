from . import main
from flask import render_template, request, jsonify
from omero_search_client.app_data import get_help_file_contenets
from omero_search_client import omero_client_app

operator_choices=[("equals", "equals"), ("not_equals", "not equals"), ("contains", "contains")
        , ("not_contains", "not contains")]
                                        #("gt", ">"),("gte", ">="), ("lt", "<"),
                                        #         ("lte", "<=")]

@main.route('/',methods=['POST', 'GET'])
def index ():
    '''
    this uses the same template for the main mode
    may be it is needed to the main template to be more user friendly
    Returns:
    '''
    help_contents=get_help_file_contenets()
    search_engine_url = omero_client_app.config.get("OMERO_SEARCH_ENGINE_BASE_URL") + "/api/v1/resources"
    return render_template(
        'main_page.html',
        search_engine_url=search_engine_url,
        operator_choices=operator_choices,
        task_id="None",
        help_contents=help_contents,
        mode="usesearchterms"
    ) 
