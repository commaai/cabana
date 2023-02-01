#!/usr/bin/env python3
import argparse
import json
from selfdrive.car.car_helpers import get_interface_attr

def generate_dbc_json():
    all_cars_by_brand = get_interface_attr("CAR_INFO")
    all_dbcs_by_brand = get_interface_attr("DBC")
    dbc_map = {car: all_dbcs_by_brand[brand][car]['pt'] for brand, cars in all_cars_by_brand.items() for car in cars if car != 'mock'}
    return json.dumps(dict(sorted(dbc_map.items())), indent=2)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generates a mapping of all car fingerprints to DBC names and outputs as a json file")
    parser.add_argument("--out", required=True, help="Output file path for the generated json")
    args = parser.parse_args()
    with open(args.out, 'w') as f:
        f.write(generate_dbc_json())
    print(f"Generated and written to {args.out}")
