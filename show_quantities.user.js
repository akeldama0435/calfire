// ==UserScript==
// @name         CAL FIRE – Show Structures Damaged/Destroyed in Incidents List (Pagination Fixed)
// @namespace    -
// @version      1.2
// @description  Adds columns “Structures Damaged” and “Structures Destroyed” to the CAL FIRE Incidents page, fetching data from individual incident pages. Works across all paginated results.
// @match        https://www.fire.ca.gov/incidents/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      fire.ca.gov
// ==/UserScript==

(function () {
    'use strict';

    // Utility: parse HTML string to DOM
    function parseHTML(str) {
        let parser = new DOMParser();
        return parser.parseFromString(str, 'text/html');
    }

    // Insert new table headers for the extra columns
    function insertTableHeaders(table) {
        let thead = table.querySelector('thead');
        if (!thead) return;
        let headerRow = thead.querySelector('tr');
        if (!headerRow) return;
        // avoid inserting twice
        if (headerRow.querySelector('.hdr-damaged')) return;

        let thDamaged = document.createElement('th');
        thDamaged.textContent = 'Structures Damaged';
        thDamaged.className = 'hdr-damaged';
        headerRow.appendChild(thDamaged);

        let thDestroyed = document.createElement('th');
        thDestroyed.textContent = 'Structures Destroyed';
        thDestroyed.className = 'hdr-destroyed';
        headerRow.appendChild(thDestroyed);
    }

    // Insert placeholder cells ("Loading...") for each row
    function insertPlaceholderCells(row) {
        if (row.querySelector('.cell-damaged')) return;

        let tdDamaged = document.createElement('td');
        tdDamaged.textContent = 'Loading...';
        tdDamaged.className = 'cell-damaged';
        row.appendChild(tdDamaged);

        let tdDestroyed = document.createElement('td');
        tdDestroyed.textContent = 'Loading...';
        tdDestroyed.className = 'cell-destroyed';
        row.appendChild(tdDestroyed);
    }

    // Extract structure data from incident detail page
    function extractStructData(detailDoc) {
        let damaged = null;
        let destroyed = null;

        let lis = Array.from(detailDoc.querySelectorAll('li'));
        for (let li of lis) {
            let txt = li.textContent.trim();
            let mDam = txt.match(/^([\d,]+)\s+Structures\s+Damaged/i);
            if (mDam) {
                damaged = mDam[1].replace(/,/g, '');
            }
            let mDes = txt.match(/^([\d,]+)\s+Structures\s+Destroyed/i);
            if (mDes) {
                destroyed = mDes[1].replace(/,/g, '');
            }
            if (damaged !== null && destroyed !== null) break;
        }

        return {
            damaged: damaged !== null ? damaged : 'No Data',
            destroyed: destroyed !== null ? destroyed : 'No Data'
        };
    }

    // Load incident details and fill in cells
    function processIncidentRow(row) {
        let link = row.querySelector('a[href*="/incidents/"]');
        if (!link) {
            row.querySelector('.cell-damaged').textContent = 'No Data';
            row.querySelector('.cell-destroyed').textContent = 'No Data';
            return;
        }
        let url = link.href;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function (response) {
                if (response.status >= 200 && response.status < 300) {
                    let detailDoc = parseHTML(response.responseText);
                    let data = extractStructData(detailDoc);

                    row.querySelector('.cell-damaged').textContent =
                        data.damaged !== 'No Data' ? Number(data.damaged).toLocaleString() : 'No Data';
                    row.querySelector('.cell-destroyed').textContent =
                        data.destroyed !== 'No Data' ? Number(data.destroyed).toLocaleString() : 'No Data';
                } else {
                    row.querySelector('.cell-damaged').textContent = 'No Data';
                    row.querySelector('.cell-destroyed').textContent = 'No Data';
                }
            },
            onerror: function () {
                row.querySelector('.cell-damaged').textContent = 'No Data';
                row.querySelector('.cell-destroyed').textContent = 'No Data';
            }
        });
    }

    // Main logic
    function init() {
        let table = document.querySelector('table');
        if (!table) return;

        insertTableHeaders(table);

        let tbody = table.querySelector('tbody');
        if (!tbody) return;

        let rows = Array.from(tbody.querySelectorAll('tr'));
        rows.forEach(row => {
            if (!row.querySelector('.cell-damaged')) {
                insertPlaceholderCells(row);
                processIncidentRow(row);
            }
        });
    }

    // Observe dynamic content loading (pagination, filters, etc.)
    function observeTableChanges() {
        const container = document.querySelector('main') || document.body;
        if (!container) return;

        const observer = new MutationObserver(() => {
            init();
        });

        observer.observe(container, {
            childList: true,
            subtree: true
        });
    }

    // Initial run
    window.addEventListener('load', () => {
        init();
        observeTableChanges();
    });

    // Basic styles
    GM_addStyle(`
        .hdr-damaged, .hdr-destroyed {
            min-width: 120px;
        }
        .cell-damaged, .cell-destroyed {
            text-align: center;
        }
    `);

})();
