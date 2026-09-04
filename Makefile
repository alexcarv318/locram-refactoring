ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
LOCRAM_HOME := $(ROOT)/.locram-dev

ifeq ($(wildcard $(ROOT)/backend/.venv/bin/python),)
BACKEND_PYTHON := uv run python
else
BACKEND_PYTHON := .venv/bin/python
endif

.PHONY: dev\:web

dev\:web:
	@echo "backend  http://127.0.0.1:8757"
	@echo "frontend http://127.0.0.1:1420"
	@echo "data     $(LOCRAM_HOME)"
	@mkdir -p "$(LOCRAM_HOME)"
	@trap 'kill 0' INT TERM EXIT; \
	( cd "$(ROOT)/backend" && \
	  LOCRAM_HOME="$(LOCRAM_HOME)" PYTHONPATH=src \
	  $(BACKEND_PYTHON) -m api.main ) & \
	( cd "$(ROOT)/frontend" && npm run dev ) & \
	wait
