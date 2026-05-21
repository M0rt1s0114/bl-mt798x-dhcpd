/* SPDX-License-Identifier: GPL-2.0 */
/*
 * Copyright (C) 2026 Yuzhii0718
 *
 * All rights reserved.
 *
 * This file is part of the project bl-mt798x-dhcpd
 * You may not use, copy, modify or distribute this file except in compliance with the license agreement.
 */

function flashSetStatus(message) {
    var statusElement = document.getElementById("flash_status");
    var txt = document.getElementById("flash_status_text");
    var spin = document.getElementById("flash_spinner");
    var busy = message === t("flash.status.uploading") || message === t("flash.status.restoring");
    if (!statusElement) return;
    statusElement.style.display = message ? "flex" : "none";
    txt && (txt.textContent = message || "");
    spin && (spin.style.display = busy ? "block" : "none");
}

function flashSetProgress(percent) {
    var progressElement = document.getElementById("flash_restore_bar"), boundedPercent;
    if (!progressElement) return;
    if (percent === null || percent === undefined) {
        progressElement.style.display = "none";
        return;
    }
    boundedPercent = Math.max(0, Math.min(100, parseInt(percent || 0)));
    progressElement.style.display = "block";
    progressElement.style.setProperty("--percent", boundedPercent)
}

function flashUpdateRangeHint() {
    var rangeHintElement = document.getElementById("flash_range_hint"), startValue, endValue, rangeSize;
    if (!rangeHintElement) return;
    startValue = parseUserLen(document.getElementById("flash_start").value);
    endValue = parseUserLen(document.getElementById("flash_end").value);
    startValue === null || endValue === null ? rangeHintElement.textContent = t("backup.range.hint") : (rangeSize = endValue >= startValue ? endValue - startValue : 0, rangeHintElement.textContent = "Start=" + bytesToHuman(startValue) + ", End=" + bytesToHuman(endValue) + ", Size=" + bytesToHuman(rangeSize))
}

function flashPadHex(value, width) {
    var hexString = value.toString(16).toUpperCase();
    while (hexString.length < width) hexString = "0" + hexString;
    return hexString
}

function flashExtractBytes(text) {
    var bytes = [];
    if (!text) return bytes;
    var byteMatches = text.match(/[0-9a-fA-F]{2}/g);
    if (!byteMatches) return bytes;
    for (var byteIndex = 0; byteIndex < byteMatches.length; byteIndex++) bytes.push(parseInt(byteMatches[byteIndex], 16));
    return bytes
}

function flashPosToByteIndex(text, pos) {
    var charIndex, hexDigitCount = 0;
    if (!text || pos <= 0) return 0;
    for (charIndex = 0; charIndex < pos && charIndex < text.length; charIndex++) {
        if (/[0-9a-fA-F]/.test(text[charIndex])) hexDigitCount++;
    }
    return Math.floor(hexDigitCount / 2)
}

function flashByteIndexToPos(byteIndex) {
    if (!isFinite(byteIndex) || byteIndex < 0) return 0;
    var lineIndex = Math.floor(byteIndex / 16);
    var columnIndex = byteIndex % 16;
    return lineIndex * 48 + columnIndex * 3
}

function flashSetCaretToByte(byteIndex) {
    var data = document.getElementById("flash_data");
    if (!data) return;
    var pos = flashByteIndexToPos(byteIndex);
    data.focus();
    data.setSelectionRange(pos, pos);
    flashSyncScroll()
}

function flashFormatHexLines(bytes) {
    var lines = [];
    for (var byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
        if (byteIndex && byteIndex % 16 === 0) lines.push("\n");
        lines.push(flashPadHex(bytes[byteIndex], 2));
        if (byteIndex % 16 !== 15 && byteIndex !== bytes.length - 1) lines.push(" ");
    }
    return lines.join("")
}

function flashRenderHexViews() {
    var dataElement = document.getElementById("flash_data");
    var offsetElement = document.getElementById("flash_offset");
    var asciiElement = document.getElementById("flash_ascii");
    var start = document.getElementById("flash_start");
    if (!dataElement || !offsetElement || !asciiElement) return;
    var bytes = flashExtractBytes(dataElement.value || "");
    var base = start ? parseUserLen(start.value) : 0;
    base = base === null ? 0 : base;
    var asciiLines = [];
    var offLines = [];
    var rowIndex, columnIndex, rowBytes, byteValue;
    for (rowIndex = 0; rowIndex < bytes.length; rowIndex += 16) {
        rowBytes = bytes.slice(rowIndex, rowIndex + 16);
        offLines.push("0x" + flashPadHex(base + rowIndex, 8));
        for (columnIndex = 0; columnIndex < rowBytes.length; columnIndex++) {
            byteValue = rowBytes[columnIndex];
            asciiLines.push(byteValue >= 0x20 && byteValue <= 0x7E ? String.fromCharCode(byteValue) : ".");
        }
        if (rowBytes.length < 16) {
            for (columnIndex = rowBytes.length; columnIndex < 16; columnIndex++) asciiLines.push(" ");
        }
        asciiLines.push("\n");
    }
    offsetElement.textContent = offLines.join("\n");
    asciiElement.textContent = asciiLines.join("").replace(/\n$/, "");
}

function flashNormalizeHexInput() {
    var dataElement = document.getElementById("flash_data");
    if (!dataElement) return;
    var bytes = flashExtractBytes(dataElement.value || "");
    dataElement.value = flashFormatHexLines(bytes);
    flashRenderHexViews()
}

function flashAlignInput(keepCaret) {
    var dataElement = document.getElementById("flash_data");
    if (!dataElement) return;
    var caretPosition = dataElement.selectionStart || 0;
    var byteIndex = flashPosToByteIndex(dataElement.value || "", caretPosition);
    var bytes = flashExtractBytes(dataElement.value || "");
    dataElement.value = flashFormatHexLines(bytes);
    if (keepCaret)
        flashSetCaretToByte(byteIndex);
    flashRenderHexViews()
}

function flashFormatData() {
    if (!confirm(t("flash.confirm.format"))) return;
    flashAlignInput(false);
    flashSetStatus(t("flash.status.formatted"))
}

function flashSnapCaret() {
    var dataElement = document.getElementById("flash_data");
    if (!dataElement) return;
    var caretPosition = dataElement.selectionStart || 0;
    var byteIndex = flashPosToByteIndex(dataElement.value || "", caretPosition);
    flashSetCaretToByte(byteIndex)
}

function flashSyncScroll() {
    var dataElement = document.getElementById("flash_data");
    var offsetElement = document.getElementById("flash_offset");
    var asciiElement = document.getElementById("flash_ascii");
    if (!dataElement || !offsetElement || !asciiElement) return;
    offsetElement.scrollTop = dataElement.scrollTop;
    asciiElement.scrollTop = dataElement.scrollTop
}

function flashJumpToOffset() {
    var jumpInput = document.getElementById("flash_jump");
    var start = document.getElementById("flash_start");
    var dataElement = document.getElementById("flash_data");
    if (!jumpInput || !dataElement) return;
    var targetOffset = parseUserLen(jumpInput.value);
    if (targetOffset === null) {
        flashSetStatus(t("flash.error.jump"));
        return
    }
    var base = start ? parseUserLen(start.value) : 0;
    base = base === null ? 0 : base;
    var bytes = flashExtractBytes(dataElement.value || "");
    var byteIndex = targetOffset - base;
    if (byteIndex < 0 || byteIndex >= bytes.length) {
        flashSetStatus(t("flash.error.jump"));
        return
    }
    flashSetCaretToByte(byteIndex);
    var lineHeight = parseFloat(getComputedStyle(dataElement).lineHeight) || 18;
    var lineIndex = Math.floor(byteIndex / 16);
    dataElement.scrollTop = lineIndex * lineHeight;
    flashSyncScroll();
    flashSetStatus("")
}

function flashFindLastBefore(str, sub, limit) {
    var idx = -1, cur = str.indexOf(sub);
    while (cur !== -1 && cur < limit) {
        idx = cur;
        cur = str.indexOf(sub, cur + 1)
    }
    return idx
}

function flashParseBackupFilename(name) {
    if (!name) return null;
    var rangeIdx = name.indexOf("_0x"), dashIdx, startStr, endStr, start, end;
    if (rangeIdx < 0) return null;
    dashIdx = name.indexOf("-0x", rangeIdx);
    if (dashIdx < 0) return null;
    startStr = name.slice(rangeIdx + 1, dashIdx);
    endStr = name.slice(dashIdx + 1);
    start = /^0x[0-9a-fA-F]+/.exec(startStr);
    end = /^0x[0-9a-fA-F]+/.exec(endStr);
    if (!start || !end) return null;
    start = parseInt(start[0], 16);
    end = parseInt(end[0], 16);
    if (!isFinite(start) || !isFinite(end) || end <= start) return null;
    var mtdIdx = flashFindLastBefore(name, "_mtd_", rangeIdx);
    var mmcIdx = flashFindLastBefore(name, "_mmc_", rangeIdx);
    var stypeIdx = mtdIdx >= 0 && mmcIdx >= 0 ? (mtdIdx > mmcIdx ? mtdIdx : mmcIdx) : (mtdIdx >= 0 ? mtdIdx : mmcIdx);
    if (stypeIdx < 0) return null;
    var storage = stypeIdx === mtdIdx ? "mtd" : "mmc";
    var seg = name.slice(stypeIdx + 5, rangeIdx);
    if (!seg) return null;
    var parts = seg.split("_");
    var target = parts[parts.length - 1];
    if (!target) return null;
    return { storage: storage, target: target, start: start, end: end }
}

function flashSelectTarget(val) {
    var targetSelect = document.getElementById("flash_target"), optionIndex;
    if (!targetSelect) return false;
    for (optionIndex = 0; optionIndex < targetSelect.options.length; optionIndex++) if (targetSelect.options[optionIndex].value === val) {
        targetSelect.selectedIndex = optionIndex;
        return true
    }
    return false
}

function flashGetDeviceNameByStorage(storage) {
    var backupInfo = APP_STATE && APP_STATE.backupinfo ? APP_STATE.backupinfo : null;
    var mmcName = "";
    var mtdName = "";
    if (backupInfo && backupInfo.mmc && backupInfo.mmc.present) {
        mmcName = [backupInfo.mmc.vendor || "", backupInfo.mmc.product || ""].join(" ").trim();
        if (!mmcName) mmcName = "MMC";
    }
    if (backupInfo && backupInfo.mtd && backupInfo.mtd.present) {
        mtdName = (backupInfo.mtd.model || "").trim();
        if (!mtdName) mtdName = "MTD";
    }
    if (storage === "mtd") return mtdName || "MTD";
    if (storage === "mmc") return mmcName || "MMC";
    return mtdName || mmcName || "device";
}

function flashBuildErasePlan() {
    var targetSelect = document.getElementById("flash_target");
    var startInput = document.getElementById("flash_start");
    var endInput = document.getElementById("flash_end");
    var targetValue, targetParts, storageType, targetName, isRawTarget;
    var startText, endText, hasStartRange, hasEndRange, startValue, endValue;
    var targetLabel, detailText;

    if (!targetSelect || !targetSelect.value)
        return { error: t("flash.error.no_target") };

    targetValue = String(targetSelect.value);
    targetParts = targetValue.split(":");
    storageType = targetParts.length > 1 ? targetParts[0] : "auto";
    targetName = targetParts.length > 1 ? targetParts.slice(1).join(":") : targetValue;
    isRawTarget = targetName === "raw";

    startText = startInput && startInput.value ? String(startInput.value).trim() : "";
    endText = endInput && endInput.value ? String(endInput.value).trim() : "";
    hasStartRange = !!startText;
    hasEndRange = !!endText;

    if (hasStartRange !== hasEndRange)
        return { error: t("flash.error.bad_range") };

    if (hasStartRange && hasEndRange) {
        startValue = parseUserLen(startText);
        endValue = parseUserLen(endText);
        if (startValue === null || endValue === null || endValue <= startValue)
            return { error: t("flash.error.bad_range") };
    }

    if (isRawTarget && !hasStartRange)
        return { error: t("flash.error.bad_range") + " (raw target requires start/end)" };

    targetLabel = isRawTarget ? "" : (targetName + " 分区");
    detailText = hasStartRange ? (isRawTarget ? ("0x" + startValue.toString(16) + "~0x" + endValue.toString(16)) : (targetLabel + " 的 0x" + startValue.toString(16) + "~0x" + endValue.toString(16))) : targetLabel;

    return {
        storage: storageType,
        target: targetValue,
        hasRange: hasStartRange,
        start: hasStartRange ? startValue : null,
        end: hasStartRange ? endValue : null,
        detail: detailText,
        deviceName: flashGetDeviceNameByStorage(storageType)
    };
}

function flashInit() {
    var targetSelect = document.getElementById("flash_target");
    var startInput = document.getElementById("flash_start");
    var endInput = document.getElementById("flash_end");
    var dataElement = document.getElementById("flash_data");
    var infoElement = document.getElementById("flash_info");
    var restoreInfoElement = document.getElementById("flash_restore_info");
    var backupInput = document.getElementById("flash_backup");

    startInput && (startInput.oninput = function () { flashUpdateRangeHint(); flashRenderHexViews(); });
    endInput && (endInput.oninput = flashUpdateRangeHint);
    flashUpdateRangeHint();
    flashRenderHexViews();
    flashSetStatus("");

    if (dataElement) {
        dataElement.addEventListener("input", function () { flashAlignInput(true); });
        dataElement.addEventListener("blur", function () { flashAlignInput(false); });
        dataElement.addEventListener("click", flashSnapCaret);
        dataElement.addEventListener("keyup", flashSnapCaret);
        dataElement.addEventListener("scroll", flashSyncScroll);
    }

    backupInput && (backupInput.onchange = function () {
        var selectedFile = backupInput.files && backupInput.files.length ? backupInput.files[0] : null;
        var parsedBackup = selectedFile ? flashParseBackupFilename(selectedFile.name) : null;
        if (!parsedBackup) {
            restoreInfoElement && (restoreInfoElement.textContent = t("flash.detected.none"));
            return;
        }
        restoreInfoElement && (restoreInfoElement.textContent = parsedBackup.storage + ":" + parsedBackup.target + " 0x" + parsedBackup.start.toString(16) + "-0x" + parsedBackup.end.toString(16));
        flashSelectTarget(parsedBackup.storage + ":" + parsedBackup.target);
        startInput && (startInput.value = "0x" + parsedBackup.start.toString(16));
        endInput && (endInput.value = "0x" + parsedBackup.end.toString(16));
        flashUpdateRangeHint();
        flashRenderHexViews();
    });

    ajax({
        url: "/backup/info",
        done: function (responseText) {
            var backupInfo, infoParts, placeholderOption, rawOption;
            try {
                backupInfo = JSON.parse(responseText);
            } catch (error) {
                flashSetStatus("backupinfo parse failed");
                return;
            }

            if (infoElement) {
                infoParts = [];
                backupInfo.mmc && backupInfo.mmc.present ? infoParts.push("MMC: " + (backupInfo.mmc.vendor || "") + " " + (backupInfo.mmc.product || "")) : infoParts.push("MMC: " + t("backup.storage.not_present"));
                backupInfo.mtd && backupInfo.mtd.present ? infoParts.push("MTD: " + (backupInfo.mtd.model || "")) : infoParts.push("MTD: " + t("backup.storage.not_present"));
                infoElement.textContent = infoParts.join(" | ");
            }

            if (!targetSelect) return;
            targetSelect.options.length = 0;
            placeholderOption = document.createElement("option");
            placeholderOption.value = "";
            placeholderOption.dataset.i18nKey = "backup.target.placeholder";
            targetSelect.appendChild(placeholderOption);

            if (backupInfo.mmc && backupInfo.mmc.present) {
                rawOption = document.createElement("option");
                rawOption.value = "mmc:raw";
                rawOption.textContent = "[MMC] raw";
                targetSelect.appendChild(rawOption);
                backupInfo.mmc.parts && backupInfo.mmc.parts.length && backupInfo.mmc.parts.forEach(function (partition) {
                    var partitionOption;
                    if (!partition || !partition.name) return;
                    partitionOption = document.createElement("option");
                    partitionOption.value = "mmc:" + partition.name;
                    partitionOption.textContent = "[MMC] " + partition.name + (partition.size ? " (" + bytesToHuman(partition.size) + ")" : "");
                    targetSelect.appendChild(partitionOption);
                });
            }

            if (backupInfo.mtd && backupInfo.mtd.present && backupInfo.mtd.parts && backupInfo.mtd.parts.length) {
                var mtdType = backupInfo.mtd.type;
                var hasMasterPartitions = mtdType === 3 || mtdType === 4 || mtdType === 8;
                var masterPartitions = [];

                if (hasMasterPartitions) {
                    backupInfo.mtd.parts.forEach(function (partition) {
                        if (partition && partition.name && partition.master)
                            masterPartitions.push(partition);
                    });
                }

                hasMasterPartitions && masterPartitions.length && masterPartitions.forEach(function (partition) {
                    var fullDiskOption = document.createElement("option");
                    fullDiskOption.value = "mtd:" + partition.name;
                    fullDiskOption.dataset.mtdName = partition.name;
                    fullDiskOption.dataset.size = partition.size ? String(partition.size) : "";
                    fullDiskOption.dataset.kind = "mtd-full";
                    targetSelect.appendChild(fullDiskOption);
                });

                backupInfo.mtd.parts.forEach(function (partition) {
                    var partitionOption;
                    if (!partition || !partition.name) return;
                    if (hasMasterPartitions && partition.master) return;
                    partitionOption = document.createElement("option");
                    partitionOption.value = "mtd:" + partition.name;
                    partitionOption.textContent = "[MTD] " + partition.name + (partition.size ? " (" + bytesToHuman(partition.size) + ")" : "");
                    partitionOption.dataset.kind = "mtd-part";
                    targetSelect.appendChild(partitionOption);
                });
            }

            targetSelect.options.length > 1 && (targetSelect.selectedIndex = 1);
            backupRefreshI18n();
        }
    });
}

async function flashRead() {
    var targetSelect = document.getElementById("flash_target");
    var startInput = document.getElementById("flash_start");
    var endInput = document.getElementById("flash_end");
    var dataElement = document.getElementById("flash_data");
    if (!targetSelect || !startInput || !endInput) return;
    if (!targetSelect.value) {
        alert(t("flash.error.no_target"));
        return;
    }
    if (!startInput.value || !endInput.value) {
        alert(t("flash.error.bad_range"));
        return;
    }
    try {
        flashSetStatus(t("flash.status.reading"));
        var formData = new FormData();
        formData.append("op", "read");
        formData.append("storage", "auto");
        formData.append("target", targetSelect.value);
        formData.append("start", startInput.value);
        formData.append("end", endInput.value);
        var response = await fetch("/flash/read", { method: "POST", body: formData });
        var responseText = await response.text();
        if (!response.ok) {
            flashSetStatus(t("flash.status.http") + " " + response.status + (responseText ? ": " + responseText : ""));
            return;
        }
        var payload;
        try { payload = JSON.parse(responseText); } catch (error) { flashSetStatus(t("flash.status.error") + " parse"); return; }
        if (!payload || !payload.ok) {
            flashSetStatus(t("flash.status.error") + " " + (payload && payload.error ? payload.error : ""));
            return;
        }
        dataElement && (dataElement.value = payload.data || "");
        flashNormalizeHexInput();
        flashSetStatus(t("flash.status.done"));
    } catch (error) {
        flashSetStatus(t("flash.status.error") + " " + (error && error.message ? error.message : String(error)));
    }
}

async function flashWrite() {
    var targetSelect = document.getElementById("flash_target");
    var startInput = document.getElementById("flash_start");
    var dataElement = document.getElementById("flash_data");
    if (!targetSelect || !startInput || !dataElement) return;
    if (!targetSelect.value) {
        alert(t("flash.error.no_target"));
        return;
    }
    if (!startInput.value) {
        alert(t("flash.error.bad_range"));
        return;
    }
    if (!dataElement.value || !dataElement.value.trim()) {
        alert(t("flash.error.no_data"));
        return;
    }
    if (!confirm(t("flash.confirm.write"))) return;
    try {
        flashSetStatus(t("flash.status.writing"));
        var formData = new FormData();
        formData.append("op", "write");
        formData.append("storage", "auto");
        formData.append("target", targetSelect.value);
        formData.append("start", startInput.value);
        formData.append("data", dataElement.value);
        var response = await fetch("/flash/write", { method: "POST", body: formData });
        var responseText = await response.text();
        if (!response.ok) {
            flashSetStatus(t("flash.status.http") + " " + response.status + (responseText ? ": " + responseText : ""));
            return;
        }
        var payload;
        try { payload = JSON.parse(responseText); } catch (error) { flashSetStatus(t("flash.status.error") + " parse"); return; }
        if (!payload || !payload.ok) {
            flashSetStatus(t("flash.status.error") + " " + (payload && payload.error ? payload.error : ""));
            return;
        }
        flashSetStatus(t("flash.status.done"));
    } catch (error) {
        flashSetStatus(t("flash.status.error") + " " + (error && error.message ? error.message : String(error)));
    }
}

async function flashErase() {
    var erasePlan = flashBuildErasePlan();
    if (erasePlan.error) {
        alert(erasePlan.error);
        return;
    }
    if (!confirm(t("flash.confirm.erase"))) return;
    var confirmDetail = t("flash.confirm.erase_detail").replace("{device}", erasePlan.deviceName).replace("{detail}", erasePlan.detail);
    if (!confirm(confirmDetail)) return;
    try {
        flashSetStatus(t("flash.status.erasing"));
        var formData = new FormData();
        formData.append("op", "erase");
        formData.append("storage", "auto");
        formData.append("target", erasePlan.target);
        if (erasePlan.hasRange) {
            formData.append("start", "0x" + erasePlan.start.toString(16));
            formData.append("end", "0x" + erasePlan.end.toString(16));
        }
        var response = await fetch("/flash/erase", { method: "POST", body: formData });
        var responseText = await response.text();
        if (!response.ok) {
            flashSetStatus(t("flash.status.http") + " " + response.status + (responseText ? ": " + responseText : ""));
            return;
        }
        var payload;
        try { payload = JSON.parse(responseText); } catch (error) { flashSetStatus(t("flash.status.error") + " parse"); return; }
        if (!payload || !payload.ok) {
            flashSetStatus(t("flash.status.error") + " " + (payload && payload.error ? payload.error : ""));
            return;
        }
        flashSetStatus(t("flash.status.done"));
    } catch (error) {
        flashSetStatus(t("flash.status.error") + " " + (error && error.message ? error.message : String(error)));
    }
}

async function flashRestore() {
    var targetSelect = document.getElementById("flash_target");
    var startInput = document.getElementById("flash_start");
    var endInput = document.getElementById("flash_end");
    var backupInput = document.getElementById("flash_backup");
    var backupFile, baseStart, baseEnd, totalSize;
    var chunkSize = 4 * 1024 * 1024;
    var useChunked;

    function toHex(n) {
        return "0x" + n.toString(16);
    }

    async function sendChunk(blob, chunkOffset, chunkEnd, totalSize, baseStart) {
        return await new Promise(function (resolve, reject) {
            var formData = new FormData();
            formData.append("op", "restore");
            formData.append("backup", blob, "restore_chunk.bin");
            targetSelect && targetSelect.value && formData.append("target", targetSelect.value);
            formData.append("start", toHex(baseStart + chunkOffset));
            formData.append("end", toHex(baseStart + chunkEnd));
            formData.append("storage", "auto");

            var xhr = new XMLHttpRequest();
            xhr.upload.onprogress = function (evt) {
                if (!evt || !evt.lengthComputable) return;
                flashSetProgress((chunkOffset + evt.loaded) / totalSize * 100);
            };
            xhr.upload.onload = function () {
                flashSetProgress((chunkOffset + (chunkEnd - chunkOffset)) / totalSize * 100);
                flashSetStatus(t("flash.status.restoring"));
            };
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                if (xhr.status !== 200) {
                    flashSetStatus(t("flash.status.http") + " " + xhr.status + (xhr.responseText ? ": " + xhr.responseText : ""));
                    flashSetProgress(null);
                    reject(new Error("http"));
                    return;
                }
                var payload;
                try { payload = JSON.parse(xhr.responseText); } catch (error) {
                    flashSetStatus(t("flash.status.error") + " parse");
                    flashSetProgress(null);
                    reject(error);
                    return;
                }
                if (!payload || !payload.ok) {
                    flashSetStatus(t("flash.status.error") + " " + (payload && payload.error ? payload.error : ""));
                    flashSetProgress(null);
                    reject(new Error("bad"));
                    return;
                }
                if (payload.alert)
                    window.__flash_restore_alert = payload.alert;
                resolve();
            };
            xhr.open("POST", "/flash/restore");
            xhr.send(formData);
        });
    }

    if (!backupInput || !backupInput.files || !backupInput.files.length) {
        alert(t("flash.error.no_file"));
        return;
    }
    if (!confirm(t("flash.confirm.restore"))) return;
    try {
        backupFile = backupInput.files[0];
        totalSize = backupFile ? backupFile.size : 0;
        baseStart = startInput ? parseUserLen(startInput.value) : null;
        baseEnd = endInput ? parseUserLen(endInput.value) : null;
        if ((baseStart === null || baseEnd === null) && backupFile && backupFile.name) {
            var parsedBackup = flashParseBackupFilename(backupFile.name);
            if (parsedBackup) {
                baseStart = parsedBackup.start;
                baseEnd = parsedBackup.end;
                if (targetSelect && !targetSelect.value && parsedBackup.storage && parsedBackup.target)
                    flashSelectTarget(parsedBackup.storage + ":" + parsedBackup.target);
                startInput && (startInput.value = toHex(baseStart));
                endInput && (endInput.value = toHex(baseEnd));
            }
        }
        if (baseStart === null || baseEnd === null || baseEnd <= baseStart) {
            flashSetStatus(t("flash.error.bad_range"));
            return;
        }
        if ((baseEnd - baseStart) !== totalSize) {
            flashSetStatus(t("flash.error.bad_range"));
            return;
        }

        useChunked = totalSize > chunkSize;
        flashSetProgress(0);
        flashSetStatus(t("flash.status.uploading"));

        if (!useChunked) {
            await sendChunk(backupFile, 0, totalSize, totalSize, baseStart);
        } else {
            var offset = 0;
            while (offset < totalSize) {
                var next = Math.min(offset + chunkSize, totalSize);
                var blob = backupFile.slice(offset, next);
                await sendChunk(blob, offset, next, totalSize, baseStart);
                offset = next;
            }
        }

        flashSetProgress(100);
        flashSetStatus(t("flash.status.done"));
        alert(t("flash.status.restored", window.__flash_restore_alert || "Backup restore completed."));
        window.__flash_restore_alert = "";
    } catch (error) {
        flashSetStatus(t("flash.status.error") + " " + (error && error.message ? error.message : String(error)));
    }
}
