.DEFAULT_GOAL := help

SHELL := /bin/bash

NPM := npm
GO := go
DOCKER_COMPOSE := docker compose
API_DIR := apps/api

.PHONY: help setup install dev web api up down logs build test fmt db-up db-down db-migrate db-logs db-psql smoke

help: ## Show available commands
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*## "}; {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: install db-up db-migrate ## Prepare local development

install: ## Install web and API dependencies
	$(NPM) install
	cd $(API_DIR) && $(GO) mod tidy

dev: ## Run frontend and API together
	$(NPM) run dev

web: ## Run frontend only
	$(NPM) run dev:web

api: ## Run backend only
	$(NPM) run dev:api

up: ## Bring the full docker compose stack up
	$(DOCKER_COMPOSE) up -d --build

down: ## Stop the full docker compose stack
	$(DOCKER_COMPOSE) down

logs: ## Tail compose logs for all services
	$(DOCKER_COMPOSE) logs -f

build: ## Build the full monorepo
	$(NPM) run build

test: ## Run the current verification suite
	$(NPM) run check

fmt: ## Format Go code
	cd $(API_DIR) && gofmt -w $$(find . -name '*.go')

db-up: ## Start PostgreSQL on localhost:5433
	$(DOCKER_COMPOSE) up -d db

db-down: ## Stop local containers
	$(DOCKER_COMPOSE) down

db-migrate: ## Apply the initial database schema
	$(NPM) run db:migrate

db-logs: ## Tail PostgreSQL logs
	$(DOCKER_COMPOSE) logs -f db

db-psql: ## Open a psql shell inside the PostgreSQL container
	$(DOCKER_COMPOSE) exec db psql -U aidemons -d aidemons

smoke: ## Check API health and world bootstrap
	@echo "healthz:"
	@curl -fsS http://localhost:8080/healthz
	@printf "\n\nbootstrap:"
	@curl -fsS http://localhost:8080/api/v1/world/bootstrap
	@printf "\n"
