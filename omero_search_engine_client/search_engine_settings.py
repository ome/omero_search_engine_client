#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Copyright (C) 2019 University of Dundee & Open Microscopy Environment.
# All rights reserved.
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

"""Settings for the idr_gallery app."""

import sys
from omeroweb.settings import process_custom_settings, \
  report_settings, str_slash
import json

# load settings
SEARCH_ENGINE_SETTINGS = {
    "omero.web.searchengine.url":
        ["SEARCH_ENGINE_URL",
         None,
         str_slash,
         ("Base URL for elastic search API endpoints "
          "E.g. searchengineapi/api/v1 or can be an absolute URL")],
}

process_custom_settings(sys.modules[__name__], 'SEARCH_ENGINE_SETTINGS')
report_settings(sys.modules[__name__])
