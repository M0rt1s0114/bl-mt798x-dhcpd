# SPDX-License-Identifier: GPL-2.0
#
# Copyright (C) 2026 Yuzhii0718
#
# All rights reserved.
#
# This file is part of the project bl-mt798x-dhcpd
# You may not use, copy, modify or distribute this file except in compliance with the license agreement.
#
# Quick Build Scripts
#

.DEFAULT_GOAL := build
SHELL := /bin/bash

CONFIG_FILE ?= .config
-include $(CONFIG_FILE)

MENUCONFIG_UBOOT_DIR ?= uboot-mtk-20250711

strip_quotes = $(subst ",,$(1))
config_bool = $(shell if grep -q '^$(1)=y$$' '$(CONFIG_FILE)' 2>/dev/null; then echo y; elif grep -q '^# $(1) is not set$$' '$(CONFIG_FILE)' 2>/dev/null; then echo n; else echo $(2); fi)

ifeq ($(origin VERSION), undefined)
  ifeq ($(strip $(CONFIG_VERSION_SP1)),y)
    VERSION := SP1
  else ifeq ($(strip $(CONFIG_VERSION_SP2)),y)
    VERSION := SP2
  else
    VERSION := 2025
  endif
endif

ifeq ($(origin VARIANT), undefined)
  ifeq ($(strip $(CONFIG_VARIANT_UBOOTMOD)),y)
    VARIANT := ubootmod
  else ifeq ($(strip $(CONFIG_VARIANT_NONMBM)),y)
    VARIANT := nonmbm
  else ifeq ($(strip $(CONFIG_VARIANT_OPENWRT)),y)
    VARIANT := openwrt
  else
    VARIANT := default
  endif
endif

ifeq ($(origin FSTHEME), undefined)
  ifeq ($(strip $(CONFIG_FSTHEME_GL)),y)
    FSTHEME := gl
  else ifeq ($(strip $(CONFIG_FSTHEME_MTK)),y)
    FSTHEME := mtk
  else
    FSTHEME := bootstrap
  endif
endif

ifeq ($(origin BOARD), undefined)
  BOARD := $(call strip_quotes,$(CONFIG_BOARD))
endif
ifeq ($(origin ATFCFG_DIR), undefined)
  ATFCFG_DIR := $(if $(strip $(CONFIG_ATFCFG_DIR)),$(call strip_quotes,$(CONFIG_ATFCFG_DIR)),mt798x_atf)
endif
ifeq ($(origin CFG_SUBDIR), undefined)
  CFG_SUBDIR := $(call strip_quotes,$(CONFIG_CFG_SUBDIR))
endif
ifeq ($(origin OUTPUT_DIR), undefined)
  OUTPUT_DIR := $(if $(strip $(CONFIG_OUTPUT_DIR)),$(call strip_quotes,$(CONFIG_OUTPUT_DIR)),output_bl2)
endif
ifeq ($(origin ATF_DIR), undefined)
  ATF_DIR := $(call strip_quotes,$(CONFIG_ATF_DIR))
endif
ifeq ($(origin UBOOT_DIR), undefined)
  UBOOT_DIR := $(call strip_quotes,$(CONFIG_UBOOT_DIR))
endif
ifeq ($(origin TOOLCHAIN), undefined)
  TOOLCHAIN := $(call strip_quotes,$(CONFIG_TOOLCHAIN))
endif

ifeq ($(origin MULTI_LAYOUT), undefined)
  MULTI_LAYOUT := $(if $(filter y,$(call config_bool,CONFIG_MULTI_LAYOUT,y)),1,0)
endif
ifeq ($(origin FIXED_MTDPARTS), undefined)
  FIXED_MTDPARTS := $(if $(filter y,$(call config_bool,CONFIG_FIXED_MTDPARTS,y)),1,0)
endif
ifeq ($(origin SIMG), undefined)
  SIMG := $(if $(filter y,$(call config_bool,CONFIG_SIMG,n)),1,0)
endif
ifeq ($(origin COPY_BL2), undefined)
  COPY_BL2 := $(if $(filter y,$(call config_bool,CONFIG_COPY_BL2,y)),1,0)
endif
ifeq ($(origin SILENT), undefined)
  SILENT := $(if $(filter y,$(call config_bool,CONFIG_SILENT,y)),Y,N)
endif
ifeq ($(origin BUILD_FIP), undefined)
	BUILD_FIP := $(call config_bool,CONFIG_BUILD_FIP,y)
endif
ifeq ($(origin BUILD_ATF), undefined)
	BUILD_ATF := $(call config_bool,CONFIG_BUILD_ATF,n)
endif
ifeq ($(origin BUILD_GPT), undefined)
	BUILD_GPT := $(call config_bool,CONFIG_BUILD_GPT,n)
endif
ifeq ($(origin SHOW), undefined)
  SHOW := $(if $(filter y,$(call config_bool,CONFIG_SHOW,n)),1,0)
endif
ifeq ($(origin DRAW), undefined)
  DRAW := $(if $(strip $(CONFIG_DRAW_MODE)),$(call strip_quotes,$(CONFIG_DRAW_MODE)),0)
endif
ifeq ($(origin SDMMC), undefined)
  SDMMC := $(if $(filter y,$(call config_bool,CONFIG_SDMMC,n)),1,0)
endif

.PHONY: all build boards board-configs menuconfig atf gpt clean help

build:
	@set -euo pipefail; \
	is_enabled() { case "$$1" in y|Y|1|yes|YES|true|TRUE) return 0 ;; *) return 1 ;; esac; }; \
	run_fip=0; run_atf=0; run_gpt=0; \
	if is_enabled "$(BUILD_FIP)"; then run_fip=1; fi; \
	if is_enabled "$(BUILD_ATF)"; then run_atf=1; fi; \
	if is_enabled "$(BUILD_GPT)"; then run_gpt=1; fi; \
	if [[ "$$run_fip" -eq 0 && "$$run_atf" -eq 0 && "$$run_gpt" -eq 0 ]]; then \
		echo "Error: no build action enabled. Use make menuconfig and enable BUILD_FIP/BUILD_ATF/BUILD_GPT." >&2; \
		exit 1; \
	fi; \
	if [[ "$$run_fip" -eq 1 ]]; then \
		if [[ -z "$(BOARD)" ]]; then \
			echo "Error: BOARD is not configured. Run 'make menuconfig' and set it, or pass BOARD=<board>." >&2; \
			exit 1; \
		fi; \
		printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS BOARD=\"$(BOARD)\" VERSION=\"$(VERSION)\" VARIANT=\"$(VARIANT)\" FSTHEME=\"$(FSTHEME)\" MULTI_LAYOUT=\"$(MULTI_LAYOUT)\" FIXED_MTDPARTS=\"$(FIXED_MTDPARTS)\" SIMG=\"$(SIMG)\" COPY_BL2=\"$(COPY_BL2)\" SILENT=\"$(SILENT)\" ./build.sh"; \
		env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
		BOARD="$(BOARD)" VERSION="$(VERSION)" VARIANT="$(VARIANT)" FSTHEME="$(FSTHEME)" \
		MULTI_LAYOUT="$(MULTI_LAYOUT)" FIXED_MTDPARTS="$(FIXED_MTDPARTS)" SIMG="$(SIMG)" \
		COPY_BL2="$(COPY_BL2)" SILENT="$(SILENT)" ./build.sh; \
	fi; \
	if [[ "$$run_atf" -eq 1 ]]; then \
		printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS ATF_DIR=\"$(ATF_DIR)\" VERSION=\"$(VERSION)\" VARIANT=\"$(VARIANT)\" ATFCFG_DIR=\"$(ATFCFG_DIR)\" CFG_SUBDIR=\"$(CFG_SUBDIR)\" OUTPUT_DIR=\"$(OUTPUT_DIR)\" TOOLCHAIN=\"$(TOOLCHAIN)\" ./compile_atf.sh"; \
		env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
		ATF_DIR="$(ATF_DIR)" VERSION="$(VERSION)" VARIANT="$(VARIANT)" \
		ATFCFG_DIR="$(ATFCFG_DIR)" CFG_SUBDIR="$(CFG_SUBDIR)" OUTPUT_DIR="$(OUTPUT_DIR)" \
		TOOLCHAIN="$(TOOLCHAIN)" ./compile_atf.sh; \
	fi; \
	if [[ "$$run_gpt" -eq 1 ]]; then \
		printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS VERSION=\"$(VERSION)\" SHOW=\"$(SHOW)\" DRAW=\"$(DRAW)\" SDMMC=\"$(SDMMC)\" ./generate_gpt.sh"; \
		env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
		VERSION="$(VERSION)" SHOW="$(SHOW)" DRAW="$(DRAW)" SDMMC="$(SDMMC)" ./generate_gpt.sh; \
	fi

menuconfig:
	@set -euo pipefail; \
	printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS KBUILD_KCONFIG=\"$(CURDIR)/Kconfig\" KCONFIG_CONFIG=\"$(CURDIR)/$(CONFIG_FILE)\" make -C \"$(MENUCONFIG_UBOOT_DIR)\" menuconfig"; \
	env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
	KBUILD_KCONFIG="$(CURDIR)/Kconfig" \
	KCONFIG_CONFIG="$(CURDIR)/$(CONFIG_FILE)" \
	$(MAKE) -C "$(MENUCONFIG_UBOOT_DIR)" menuconfig

all:
	@set -euo pipefail; \
	case "$(VERSION)" in \
		2025) ATF_DIR="atf-20250711"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP1|sp1) ATF_DIR="atf-20240117-bacca82a8"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP2|sp2) ATF_DIR="atf-20260123"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		*) echo "Error: unsupported VERSION='$(VERSION)'." >&2; echo "Supported: 2025/SP1/SP2" >&2; exit 1 ;; \
	esac; \
	collect_board_configs() { \
		local atf_cfg_dir="$$ATF_DIR/configs"; \
		local uboot_cfg_dir="$$UBOOT_DIR/configs"; \
		local atf_list uboot_list; \
		if [[ ! -d "$$atf_cfg_dir" || ! -d "$$uboot_cfg_dir" ]]; then \
			echo "Error: both configs directories must exist:" >&2; \
			echo "  $$atf_cfg_dir" >&2; \
			echo "  $$uboot_cfg_dir" >&2; \
			return 1; \
		fi; \
		atf_list="$$(mktemp)"; \
		uboot_list="$$(mktemp)"; \
		trap 'rm -f "$$atf_list" "$$uboot_list"' RETURN; \
		find -L "$$atf_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$atf_list"; \
		find -L "$$uboot_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$uboot_list"; \
		comm -12 "$$atf_list" "$$uboot_list"; \
	}; \
	build_one_board() { \
		local cfg_base="$$1"; \
		local soc="$${cfg_base%%_*}"; \
		local board="$${cfg_base#*_}"; \
		local log_file="output/build-$${board}-$(VERSION)-$(VARIANT).log"; \
		mkdir -p output; \
		echo "----------------------------------------------------------------------"; \
		echo "Building BOARD=$$board (SOC=$$soc, VERSION=$(VERSION), VARIANT=$(VARIANT))"; \
		echo "Log: $$log_file"; \
		printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS BOARD=\"$$board\" VERSION=\"$(VERSION)\" VARIANT=\"$(VARIANT)\" FSTHEME=\"$(FSTHEME)\" MULTI_LAYOUT=\"$(MULTI_LAYOUT)\" FIXED_MTDPARTS=\"$(FIXED_MTDPARTS)\" SIMG=\"$(SIMG)\" COPY_BL2=\"$(COPY_BL2)\" SILENT=\"$(SILENT)\" ./build.sh 2>&1 | tee \"$$log_file\""; \
		env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
		BOARD="$$board" VERSION="$(VERSION)" VARIANT="$(VARIANT)" FSTHEME="$(FSTHEME)" \
		MULTI_LAYOUT="$(MULTI_LAYOUT)" FIXED_MTDPARTS="$(FIXED_MTDPARTS)" SIMG="$(SIMG)" \
		COPY_BL2="$(COPY_BL2)" SILENT="$(SILENT)" ./build.sh 2>&1 | tee "$$log_file"; \
	}; \
	mapfile -t board_cfgs < <(collect_board_configs); \
	if [[ "$${#board_cfgs[@]}" -eq 0 ]]; then \
		echo "Error: no buildable BOARD found under $$ATF_DIR/configs and $$UBOOT_DIR/configs." >&2; \
		exit 1; \
	fi; \
	success_count=0; \
	fail_count=0; \
	total_count="$${#board_cfgs[@]}"; \
	index=0; \
	for cfg in "$${board_cfgs[@]}"; do \
		index=$$((index + 1)); \
		cfg_board="$${cfg#*_}"; \
		echo "[$$index/$$total_count] $$cfg_board"; \
		if build_one_board "$$cfg"; then \
			success_count=$$((success_count + 1)); \
		else \
			fail_count=$$((fail_count + 1)); \
			echo "Build failed for BOARD=$$cfg_board, continuing..." >&2; \
		fi; \
	done; \
	echo "----------------------------------------------------------------------"; \
	echo "Build summary: success=$$success_count, failed=$$fail_count, total=$$total_count"; \
	if [[ "$$fail_count" -gt 0 ]]; then \
		exit 1; \
	fi

boards:
	@set -euo pipefail; \
	case "$(VERSION)" in \
		2025) ATF_DIR="atf-20250711"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP1|sp1) ATF_DIR="atf-20240117-bacca82a8"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP2|sp2) ATF_DIR="atf-20260123"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		*) echo "Error: unsupported VERSION='$(VERSION)'." >&2; exit 1 ;; \
	esac; \
	collect_board_configs() { \
		local atf_cfg_dir="$$ATF_DIR/configs"; \
		local uboot_cfg_dir="$$UBOOT_DIR/configs"; \
		local atf_list uboot_list; \
		atf_list="$$(mktemp)"; \
		uboot_list="$$(mktemp)"; \
		trap 'rm -f "$$atf_list" "$$uboot_list"' RETURN; \
		find -L "$$atf_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$atf_list"; \
		find -L "$$uboot_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$uboot_list"; \
		comm -12 "$$atf_list" "$$uboot_list"; \
	}; \
	mapfile -t board_cfgs < <(collect_board_configs); \
	if [[ "$${#board_cfgs[@]}" -eq 0 ]]; then \
		echo "No buildable BOARD found."; \
		exit 0; \
	fi; \
	echo "Buildable BOARD list (intersection of $$ATF_DIR/configs and $$UBOOT_DIR/configs):"; \
	printf '  %s\n' "$${board_cfgs[@]#*_}"

board-configs:
	@set -euo pipefail; \
	case "$(VERSION)" in \
		2025) ATF_DIR="atf-20250711"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP1|sp1) ATF_DIR="atf-20240117-bacca82a8"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		SP2|sp2) ATF_DIR="atf-20260123"; UBOOT_DIR="uboot-mtk-20250711" ;; \
		*) echo "Error: unsupported VERSION='$(VERSION)'." >&2; exit 1 ;; \
	esac; \
	collect_board_configs() { \
		local atf_cfg_dir="$$ATF_DIR/configs"; \
		local uboot_cfg_dir="$$UBOOT_DIR/configs"; \
		local atf_list uboot_list; \
		atf_list="$$(mktemp)"; \
		uboot_list="$$(mktemp)"; \
		trap 'rm -f "$$atf_list" "$$uboot_list"' RETURN; \
		find -L "$$atf_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$atf_list"; \
		find -L "$$uboot_cfg_dir" -maxdepth 1 -type f -name '*_defconfig' -printf '%f\n' | sed 's/_defconfig$$//' | sort -u > "$$uboot_list"; \
		comm -12 "$$atf_list" "$$uboot_list"; \
	}; \
	mapfile -t board_cfgs < <(collect_board_configs); \
	printf '%s\n' "$${board_cfgs[@]}"

atf:
	@set -euo pipefail; \
	printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS ATF_DIR=\"$(ATF_DIR)\" VERSION=\"$(VERSION)\" VARIANT=\"$(VARIANT)\" ATFCFG_DIR=\"$(ATFCFG_DIR)\" CFG_SUBDIR=\"$(CFG_SUBDIR)\" OUTPUT_DIR=\"$(OUTPUT_DIR)\" OC7981=\"$(OC7981)\" OC7986=\"$(OC7986)\" TOOLCHAIN=\"$(TOOLCHAIN)\" ./compile_atf.sh"; \
	env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
	ATF_DIR="$(ATF_DIR)" VERSION="$(VERSION)" VARIANT="$(VARIANT)" \
	ATFCFG_DIR="$(ATFCFG_DIR)" CFG_SUBDIR="$(CFG_SUBDIR)" OUTPUT_DIR="$(OUTPUT_DIR)" \
	OC7981="$(OC7981)" OC7986="$(OC7986)" TOOLCHAIN="$(TOOLCHAIN)" ./compile_atf.sh

gpt:
	@set -euo pipefail; \
	printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS VERSION=\"$(VERSION)\" SHOW=\"$(SHOW)\" DRAW=\"$(DRAW)\" SDMMC=\"$(SDMMC)\" ./generate_gpt.sh"; \
	env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS \
	VERSION="$(VERSION)" SHOW="$(SHOW)" DRAW="$(DRAW)" SDMMC="$(SDMMC)" ./generate_gpt.sh

clean:
	@set -euo pipefail; \
	printf '%s\n' "env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS CLEAN=1 VERSION=\"$(VERSION)\" ./build.sh"; \
	env -u MAKEFLAGS -u MAKELEVEL -u MFLAGS CLEAN=1 VERSION="$(VERSION)" ./build.sh

help:
	@printf '%s\n' \
		'Quick build entry points' \
		'' \
		'Usage:' \
		'  make                     # build the current .config selection' \
		'  make all                 # build all BOARDs found in the intersection of atf/configs and uboot/configs' \
		'  make BOARD=<board>       # build a single BOARD' \
		'  make menuconfig          # edit the root .config with a U-Boot-like menu UI' \
		'  make atf                 # call compile_atf.sh' \
		'  make gpt                 # call generate_gpt.sh' \
		'  make boards              # list buildable BOARDs' \
		'  make board-configs       # list buildable config names (for automation)' \
		'  make help                # show this help' \
		'' \
		'Common variables:' \
		'  VERSION=2025|SP1|SP2' \
		'  VARIANT=default|ubootmod|nonmbm|openwrt' \
		'  FSTHEME=bootstrap|gl|mtk' \
		'  BUILD_FIP=Y|N' \
		'  BUILD_ATF=Y|N' \
		'  BUILD_GPT=Y|N' \
		'  MULTI_LAYOUT=0|1' \
		'  FIXED_MTDPARTS=0|1' \
		'  SIMG=0|1' \
		'  SILENT=Y|N' \
		'' \
		'ATF / GPT helpers:' \
		'  make atf ATFCFG_DIR=mt798x_atf CFG_SUBDIR=normal OUTPUT_DIR=output_bl2' \
		'  make gpt SHOW=1' \
		'  make gpt DRAW=1' \
		'  make gpt SDMMC=1' \
		'' \
		'Notes:' \
		'  - BOARD discovery only uses the default configs directories, and only keeps entries' \
		'    that exist in both ATF and U-Boot, matching the FIP build workflow.' \
		'  - make runs with SILENT=Y by default so batch builds do not stop for prompts.'
