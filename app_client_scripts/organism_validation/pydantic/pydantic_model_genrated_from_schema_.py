# generated by datamodel-codegen:
#   filename:  organism_schema.json
#   timestamp: 2021-11-30T13:22:53+00:00
#The following command has genrated the model from the jsonschema
#datamodel-codegen  --input organism_schema.json --input-file-type jsonschema --output model.py

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Extra, Field


class OrganismPartSchema(BaseModel):
    class Config:
        extra = Extra.forbid

    Organism_Part: str = Field(..., alias='Organism Part')
    Organism_Part_Identifier: Optional[str] = Field(
        None, alias='Organism Part Identifier'
    )


class Model(BaseModel):
    class Config:
        extra = Extra.forbid

    Organism: str
    Organism_Part: List[OrganismPartSchema] = Field(..., alias='Organism Part')
