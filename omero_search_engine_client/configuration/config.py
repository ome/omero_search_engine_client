import os
import yaml
from shutil import copyfile


def load_configuration_variables_from_file(config):
    # loading application configuration variables from a file
    #print ("Injecting config variables from :%s" % omero_search_client_app_config.OMERO_SEARCH_CLIENT_INSTANCE_CONFIG)
    print (omero_search_client_app_config.OMERO_SEARCH_CLIENT_INSTANCE_CONFIG)
    with open(omero_search_client_app_config.OMERO_SEARCH_CLIENT_INSTANCE_CONFIG) as f:
        cofg = yaml.load(f)
    for x, y in cofg.items():
        setattr(config, x, y)

def update_config_file(updated_configuration):
    is_changed=False
    with open(omero_search_client_app_config.OMERO_SEARCH_CLIENT_INSTANCE_CONFIG) as f:
        configuration = yaml.load(f)
    found=[]
    for key, value in updated_configuration.items():
        if key in configuration:
            if configuration[key]!=value:
                configuration[key]=value
                is_changed=True
                print ("%s is Updated, new value is %s "%(key, value))
            else:
                found.append(key)
    if len(found)!=len(updated_configuration):
        for key, value in updated_configuration.items():
            if key not in found:
                configuration[key] = value
                print("%s value is added with value %s " % (key, value))
                is_changed = True

    if is_changed:
        with open(omero_search_client_app_config.OMERO_SEARCH_CLIENT_INSTANCE_CONFIG, 'w') as f:
             yaml.dump(configuration, f)

class omero_search_client_app_config (object):
    # the configuration can be loadd from yml file later
    home_folder = os.path.expanduser('~')
    OMERO_SEARCH_CLIENT_INSTANCE_CONFIG = os.path.join(home_folder, '.omero_search_client.yml')
    DEPLOYED_INSTANCE_CONFIG=r"/etc/searchengineclient/.omero_search_client.yml"
    if not os.path.isfile(OMERO_SEARCH_CLIENT_INSTANCE_CONFIG):
        # Check if the configuration file exists in the docker deployed folder
        # if not, it will assume it is either development environment or deploying using other methods
        if os.path.isfile(DEPLOYED_INSTANCE_CONFIG):
            OMERO_SEARCH_CLIENT_INSTANCE_CONFIG=DEPLOYED_INSTANCE_CONFIG
        else:
            LOCAL_CONFIG_FILE = os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                             'omero_search_client.yml')
            copyfile(LOCAL_CONFIG_FILE, OMERO_SEARCH_CLIENT_INSTANCE_CONFIG)
            #print (LOCAL_CONFIG_FILE, OMERO_SEARCH_CLIENT_INSTANCE_CONFIG)

class development_app_config(omero_search_client_app_config):
    DEBUG = False
    VERIFY = False

class production_app_config(omero_search_client_app_config):
    pass

class test_app_config(omero_search_client_app_config):
    pass

configLooader = {
    'development': development_app_config,
    'testing': test_app_config,
    'production': production_app_config
}
