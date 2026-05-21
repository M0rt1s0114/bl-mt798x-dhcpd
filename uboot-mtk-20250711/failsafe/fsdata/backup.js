/* SPDX-License-Identifier: GPL-2.0 */
/*
 * Copyright (C) 2026 Yuzhii0718
 *
 * All rights reserved.
 *
 * This file is part of the project bl-mt798x-dhcpd
 * You may not use, copy, modify or distribute this file except in compliance with the license agreement.
 */

function setBackupStatus(message) {
    var statusElement = document.getElementById("backup_status");
    statusElement && (statusElement.style.display = message ? "block" : "none", statusElement.textContent = message || "")
}

function setBackupProgress(percent) {
    var progressElement = document.getElementById("bar"), boundedPercent;
    progressElement && (boundedPercent = Math.max(0, Math.min(100, parseInt(percent || 0))), progressElement.style.display = "block", progressElement.style.setProperty("--percent", boundedPercent))
}

function backupUpdateRangeHint() {
    var rangeHintElement = document.getElementById("backup_range_hint"), startValue, endValue, rangeSize;
    rangeHintElement && (startValue = parseUserLen(document.getElementById("backup_start").value), endValue = parseUserLen(document.getElementById("backup_end").value), startValue === null || endValue === null ? rangeHintElement.textContent = t("backup.range.hint") : (rangeSize = endValue >= startValue ? endValue - startValue : 0, rangeHintElement.textContent = "Start=" + bytesToHuman(startValue) + ", End=" + bytesToHuman(endValue) + ", Size=" + bytesToHuman(rangeSize)))
}

function backupRefreshI18n() {
    var targetSelect = document.getElementById("backup_target"), optionIndex, optionElement, mtdName;
    if (!targetSelect) return;
    for (optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) optionElement = targetSelect.options[optionIndex], optionElement && optionElement.dataset && optionElement.dataset.i18nKey && (optionElement.textContent = window.t(optionElement.dataset.i18nKey));
    for (optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) {
        optionElement = targetSelect.options[optionIndex];
        if (!optionElement || !optionElement.dataset) continue;
        optionElement.dataset.kind === "mtd-full" && (mtdName = optionElement.dataset.mtdName || "", optionElement.textContent = "[MTD] " + window.t("backup.target.full_disk") + (mtdName ? " (" + mtdName + ")" : "") + (optionElement.dataset.size ? " (" + bytesToHuman(parseInt(optionElement.dataset.size, 10)) + ")" : ""))
    }
}

function backupInit() {
    var modeSelect = document.getElementById("backup_mode"), rangeContainer = document.getElementById("backup_range"), targetSelect = document.getElementById("backup_target"), targetField = document.getElementById("backup_target_field"), targetRow = document.getElementById("backup_mode_target_row"), updateBackupUi, startInput, endInput;
    function selectTargetByValue(targetValue) {
        for (var optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) if (targetSelect.options[optionIndex].value === targetValue) return targetSelect.selectedIndex = optionIndex, true;
        return false
    }
    function selectTargetByKind(targetKind) {
        for (var optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) if (targetSelect.options[optionIndex].dataset && targetSelect.options[optionIndex].dataset.kind === targetKind) return targetSelect.selectedIndex = optionIndex, true;
        return false
    }
    function selectFirstNonEmptyTarget() {
        for (var optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) if (targetSelect.options[optionIndex].value) {
            targetSelect.selectedIndex = optionIndex;
            return true
        }
        return false
    }
    function ensureValidTargetSelection() {
        var selectedOption, selectedKind;
        if (!targetSelect || targetSelect.options.length <= 1) return;
        selectedOption = targetSelect.options[targetSelect.selectedIndex];
        selectedKind = selectedOption && selectedOption.dataset ? selectedOption.dataset.kind : "";
        (selectedKind === "mmc-part" || selectedKind === "mtd-part" || !targetSelect.value) && (selectTargetByValue("mmc:raw") || selectTargetByKind("mtd-full") || selectFirstNonEmptyTarget())
    }
    modeSelect && rangeContainer && targetSelect && (updateBackupUi = function () {
        var isRangeMode = modeSelect.value === "range";
        isRangeMode ? (rangeContainer.style.display = "block", ensureValidTargetSelection(), backupUpdateRangeHint()) : (rangeContainer.style.display = "none");
        targetField && (targetField.style.display = isRangeMode ? "none" : "");
        targetRow && (targetRow.style.gridTemplateColumns = isRangeMode ? "1fr" : "")
    }, modeSelect.onchange = updateBackupUi, startInput = document.getElementById("backup_start"), endInput = document.getElementById("backup_end"), startInput && (startInput.oninput = backupUpdateRangeHint), endInput && (endInput.oninput = backupUpdateRangeHint), updateBackupUi(), setBackupStatus(""), ajax({
        url: "/backup/info",
        done: function (responseText) {
            var backupInfo, infoElement, optionElement, rawOption, fullDiskOption;
            try {
                backupInfo = JSON.parse(responseText)
            } catch (error) {
                setBackupStatus("backupinfo parse failed");
                return
            }
            infoElement = document.getElementById("backup_info");
            infoElement && (optionElement = [], backupInfo.mmc && backupInfo.mmc.present ? optionElement.push("MMC: " + (backupInfo.mmc.vendor || "") + " " + (backupInfo.mmc.product || "")) : optionElement.push("MMC: " + t("backup.storage.not_present")), backupInfo.mtd && backupInfo.mtd.present ? optionElement.push("MTD: " + (backupInfo.mtd.model || "")) : optionElement.push("MTD: " + t("backup.storage.not_present")), infoElement.textContent = optionElement.join(" | "));
            targetSelect.options.length = 0;
            optionElement = document.createElement("option");
            optionElement.value = "";
            optionElement.dataset.i18nKey = "backup.target.placeholder";
            targetSelect.appendChild(optionElement);
            backupInfo.mmc && backupInfo.mmc.present && (rawOption = document.createElement("option"), rawOption.value = "mmc:raw", rawOption.textContent = "[MMC] raw", rawOption.dataset.kind = "mmc-raw", targetSelect.appendChild(rawOption), backupInfo.mmc.parts && backupInfo.mmc.parts.length && backupInfo.mmc.parts.forEach(function (partition) {
                var partOption;
                partition && partition.name && (partOption = document.createElement("option"), partOption.value = "mmc:" + partition.name, partOption.textContent = "[MMC] " + partition.name + (partition.size ? " (" + bytesToHuman(partition.size) + ")" : ""), partOption.dataset.kind = "mmc-part", targetSelect.appendChild(partOption))
            }));

            if (backupInfo.mtd && backupInfo.mtd.present && backupInfo.mtd.parts && backupInfo.mtd.parts.length) {
                var mtdType = backupInfo.mtd.type, hasMasterPartitions = mtdType === 3 || mtdType === 4 || mtdType === 8, masterPartitions = [];
                hasMasterPartitions && backupInfo.mtd.parts.forEach(function (partition) {
                    partition && partition.name && partition.master && masterPartitions.push(partition)
                });

                hasMasterPartitions && masterPartitions.length && masterPartitions.forEach(function (partition) {
                    var fullDiskOptionElement = document.createElement("option");
                    fullDiskOptionElement.value = "mtd:" + partition.name;
                    fullDiskOptionElement.dataset.mtdName = partition.name;
                    fullDiskOptionElement.dataset.size = partition.size ? String(partition.size) : "";
                    fullDiskOptionElement.dataset.kind = "mtd-full";
                    targetSelect.appendChild(fullDiskOptionElement)
                });

                backupInfo.mtd.parts.forEach(function (partition) {
                    var partitionOption;
                    if (!partition || !partition.name) return;
                    if (hasMasterPartitions && partition.master) return;
                    partitionOption = document.createElement("option");
                    partitionOption.value = "mtd:" + partition.name;
                    partitionOption.textContent = "[MTD] " + partition.name + (partition.size ? " (" + bytesToHuman(partition.size) + ")" : "");
                    partitionOption.dataset.kind = "mtd-part";
                    targetSelect.appendChild(partitionOption)
                })
            }
            targetSelect.options.length > 1 && (targetSelect.selectedIndex = 1);
            backupRefreshI18n();
            updateBackupUi && updateBackupUi()
        }
    }))
}

async function startBackup() {
    var modeSelect = document.getElementById("backup_mode"), targetSelect = document.getElementById("backup_target"), backupMode, targetValue, formData, response, contentLength, expectedLength, downloadName, downloadedBytes, saveHandle, writableStream, reader, chunk, bufferedChunks;
    if (!modeSelect || !targetSelect) return;
    if (backupMode = modeSelect.value, targetValue = targetSelect.value, !targetValue) {
        alert(t("backup.error.no_target"));
        return
    }
    formData = new FormData;
    formData.append("mode", backupMode);
    formData.append("storage", "auto");
    formData.append("target", targetValue);
    if (backupMode === "range") {
        var startInput = document.getElementById("backup_start");
        var endInput = document.getElementById("backup_end");
        if (!startInput || !endInput || !startInput.value || !endInput.value) {
            alert(t("backup.error.bad_range"));
            return
        }
        formData.append("start", startInput.value);
        formData.append("end", endInput.value)
    }
    setBackupProgress(0);
    setBackupStatus(t("backup.status.starting"));
    try {
        response = await fetch("/backup/main", { method: "POST", body: formData });
        if (!response.ok) {
            setBackupStatus(t("backup.error.http") + " " + response.status);
            return
        }
        contentLength = response.headers.get("Content-Length");
        expectedLength = contentLength ? parseInt(contentLength, 10) : 0;
        downloadName = parseFilenameFromDisposition(response.headers.get("Content-Disposition"));
        downloadName || (downloadName = "backup.bin");
        // Ensure we have board info for filename even on pages without #sysinfo
        await ensureSysInfoLoaded();
        downloadName = makeBackupDownloadName(downloadName);
        downloadedBytes = 0;
        if (window.showSaveFilePicker) {
            saveHandle = await window.showSaveFilePicker({ suggestedName: downloadName, types: [{ description: "Binary", accept: { "application/octet-stream": [".bin"] } }] });
            writableStream = await saveHandle.createWritable();
            reader = response.body.getReader();
            while (true) {
                chunk = await reader.read();
                if (chunk.done) break;
                await writableStream.write(chunk.value);
                downloadedBytes += chunk.value.length;
                expectedLength ? setBackupProgress(downloadedBytes / expectedLength * 100) : setBackupProgress(0);
                setBackupStatus(t("backup.status.downloading") + " " + bytesToHuman(downloadedBytes) + (expectedLength ? " / " + bytesToHuman(expectedLength) : ""))
            }
            await writableStream.close();
            setBackupProgress(100);
            setBackupStatus(t("backup.status.done") + " " + downloadName)
        } else {
            bufferedChunks = [];
            reader = response.body.getReader();
            while (true) {
                chunk = await reader.read();
                if (chunk.done) break;
                bufferedChunks.push(chunk.value);
                downloadedBytes += chunk.value.length;
                expectedLength ? setBackupProgress(downloadedBytes / expectedLength * 100) : setBackupProgress(0);
                setBackupStatus(t("backup.status.downloading") + " " + bytesToHuman(downloadedBytes) + (expectedLength ? " / " + bytesToHuman(expectedLength) : ""))
            }
            setBackupProgress(100);
            setBackupStatus(t("backup.status.preparing"));
            var backupBlob = new Blob(bufferedChunks, { type: "application/octet-stream" });
            var downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(backupBlob);
            downloadLink.download = downloadName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            setBackupStatus(t("backup.status.done") + " " + downloadName)
        }
    } catch (error) {
        setBackupStatus(t("backup.error.exception") + " " + (error && error.message ? error.message : String(error)))
    }
}
