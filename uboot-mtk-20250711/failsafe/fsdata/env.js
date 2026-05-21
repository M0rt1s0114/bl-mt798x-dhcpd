/* SPDX-License-Identifier: GPL-2.0 */
/*
 * Copyright (C) 2026 Yuzhii0718
 *
 * All rights reserved.
 *
 * This file is part of the project bl-mt798x-dhcpd
 * You may not use, copy, modify or distribute this file except in compliance with the license agreement.
 */

function envInit() {
    var listElement = document.getElementById("env_list");
    var nameInput = document.getElementById("env_name");
    var valueInput = document.getElementById("env_value");
    var statusElement = document.getElementById("env_status");
    var countElement = document.getElementById("env_count");
    var fileInput = document.getElementById("env_file");

    function setStatus(message) {
        statusElement && (statusElement.textContent = message || "");
    }

    function countLines(text) {
        if (!text) return 0;
        var lines = text.split("\n");
        var lineCount = 0;
        for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            if (lines[lineIndex] && lines[lineIndex].indexOf("=") > 0)
                lineCount++;
        }
        return lineCount;
    }

    window.envRefresh = async function () {
        try {
            setStatus(t("env.status.loading"));
            var response = await fetch("/env/list", { method: "GET" });
            if (!response.ok) {
                setStatus(t("env.status.http") + " " + response.status);
                return;
            }
            var responseText = await response.text();
            listElement && (listElement.textContent = responseText || "");
            countElement && (countElement.textContent = t("env.count") + " " + countLines(responseText));
            setStatus(t("env.status.ready"));
        } catch (error) {
            setStatus(t("env.status.error") + " " + (error && error.message ? error.message : String(error)));
        }
    };

    window.envSet = async function () {
        if (!nameInput || !nameInput.value) {
            alert(t("env.error.no_name"));
            return;
        }
        try {
            var formData = new FormData();
            formData.append("name", nameInput.value);
            formData.append("value", valueInput ? valueInput.value : "");
            setStatus(t("env.status.saving"));
            var response = await fetch("/env/set", { method: "POST", body: formData });
            var responseText = await response.text();
            if (!response.ok) {
                setStatus(t("env.status.error") + " " + (responseText || response.status));
                return;
            }
            setStatus(t("env.status.saved"));
            window.envRefresh();
        } catch (error) {
            setStatus(t("env.status.error") + " " + (error && error.message ? error.message : String(error)));
        }
    };

    window.envUnset = async function () {
        if (!nameInput || !nameInput.value) {
            alert(t("env.error.no_name"));
            return;
        }
        if (!confirm(t("env.confirm.delete") + " " + nameInput.value + " ?"))
            return;
        try {
            var formData = new FormData();
            formData.append("name", nameInput.value);
            setStatus(t("env.status.saving"));
            var response = await fetch("/env/unset", { method: "POST", body: formData });
            var responseText = await response.text();
            if (!response.ok) {
                setStatus(t("env.status.error") + " " + (responseText || response.status));
                return;
            }
            setStatus(t("env.status.deleted"));
            window.envRefresh();
        } catch (error) {
            setStatus(t("env.status.error") + " " + (error && error.message ? error.message : String(error)));
        }
    };

    window.envReset = async function () {
        if (!confirm(t("env.confirm.reset")))
            return;
        try {
            setStatus(t("env.status.saving"));
            var response = await fetch("/env/reset", { method: "POST" });
            var responseText = await response.text();
            if (!response.ok) {
                setStatus(t("env.status.error") + " " + (responseText || response.status));
                return;
            }
            setStatus(t("env.status.reset"));
            window.envRefresh();
        } catch (error) {
            setStatus(t("env.status.error") + " " + (error && error.message ? error.message : String(error)));
        }
    };

    window.envRestore = async function () {
        if (!fileInput || !fileInput.files || !fileInput.files.length) {
            alert(t("env.error.no_file"));
            return;
        }
        if (!confirm(t("env.confirm.restore")))
            return;
        try {
            var formData = new FormData();
            formData.append("envfile", fileInput.files[0]);
            setStatus(t("env.status.saving"));
            var response = await fetch("/env/restore", { method: "POST", body: formData });
            var responseText = await response.text();
            if (!response.ok) {
                setStatus(t("env.status.error") + " " + (responseText || response.status));
                return;
            }
            setStatus(t("env.status.restored"));
            window.envRefresh();
        } catch (error) {
            setStatus(t("env.status.error") + " " + (error && error.message ? error.message : String(error)));
        }
    };

    window.envRefresh();
}
