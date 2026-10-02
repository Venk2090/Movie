#!/usr/bin/env python3
import sys
import argparse
import json
import requests

API_BASE = "http://localhost:8000/api"

def create_command(args):
    payload = {
        "name": args.name or f"CLI Project - {args.url[:30]}",
        "source_type": "youtube",
        "source_url": args.url,
        "target_languages": args.languages.split(","),
        "resolution": args.resolution
    }
    resp = requests.post(f"{API_BASE}/projects", json=payload)
    if resp.status_code == 200:
        proj = resp.json()
        print(f"Project created: {proj['id']}")
        # Trigger run
        requests.post(f"{API_BASE}/projects/{proj['id']}/run")
        print(f"Pipeline triggered for {proj['id']}. Track with 'video-ai status --id {proj['id']}'")
    else:
        print(f"Error creating project: {resp.text}")

def list_command(args):
    resp = requests.get(f"{API_BASE}/projects")
    if resp.status_code == 200:
        projects = resp.json()
        print(f"{'ID':<24} {'STATUS':<12} {'PROGRESS':<10} {'NAME'}")
        print("-" * 65)
        for p in projects:
            print(f"{p['id']:<24} {p['status']:<12} {p['progress']:<10.1f}% {p['name']}")
    else:
        print(f"Error listing projects: {resp.text}")

def status_command(args):
    resp = requests.get(f"{API_BASE}/projects/{args.id}")
    if resp.status_code == 200:
        data = resp.json()
        proj = data["project"]
        print(f"Project ID: {proj['id']}")
        print(f"Name:       {proj['name']}")
        print(f"Status:     {proj['status']}")
        print(f"Progress:   {proj['progress']}%")
        print(f"Current:    {proj.get('current_stage')}")
        print("\nScenes:")
        for s in data.get("scenes", []):
            print(f"  Scene #{s['scene_number']}: {s['duration']}s - {s['visual_description'][:60]}...")
    else:
        print(f"Error: {resp.text}")

def hardware_command(args):
    resp = requests.get(f"{API_BASE}/system/hardware")
    if resp.status_code == 200:
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"Error: {resp.text}")

def main():
    parser = argparse.ArgumentParser(description="OpenVideoStudio CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Create
    create_p = subparsers.add_parser("create", help="Create a new localization project")
    create_p.add_argument("--url", required=True, help="YouTube source URL or media path")
    create_p.add_argument("--name", help="Project name")
    create_p.add_argument("--languages", default="en,es,pt,fr,te,kn,ml,hi,bn,gu,zh,ru", help="Comma-separated language codes")
    create_p.add_argument("--resolution", default="4k", choices=["1080p", "1440p", "4k"], help="Render resolution")

    # List
    subparsers.add_parser("list", help="List all projects")

    # Status
    status_p = subparsers.add_parser("status", help="Get project status")
    status_p.add_argument("--id", required=True, help="Project ID")

    # Hardware
    subparsers.add_parser("hardware", help="Show system hardware & GPU acceleration status")

    args = parser.parse_args()
    if args.command == "create":
        create_command(args)
    elif args.command == "list":
        list_command(args)
    elif args.command == "status":
        status_command(args)
    elif args.command == "hardware":
        hardware_command(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
