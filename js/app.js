const API_BASE_URL = '/api/issues';
const STORAGE_KEY = 'infra_channels_tracker_db';

let currentModule = 'ALL';
let currentSubSection = 'ALL';
let selectedMonths = [];
let allIssuesData = [];
let filteredIssuesData = [];
let parsedExcelRecords = [];
let selectedRowIds = new Set();
let currentPage = 1;
const itemsPerPage = 10;

let statusChart = null;
let moduleChart = null;

// Expose functions globally on window object
window.selectModule = selectModule;
window.selectSubSection = selectSubSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.editIssue = editIssue;
window.deleteIssue = deleteIssue;
window.deleteAllRecords = deleteAllRecords;
window.openImportModal = openImportModal;
window.closeImportModal = closeImportModal;
window.handleExcelFileSelect = handleExcelFileSelect;
window.confirmImport = confirmImport;
window.exportToCSV = exportToCSV;
window.resetAllFilters = resetAllFilters;
window.applyFilters = applyFilters;
window.handleMonthChange = handleMonthChange;
window.handleMonthCountFilterChange = handleMonthCountFilterChange;
window.filterTableBySearch = filterTableBySearch;
window.toggleSelectAll = toggleSelectAll;
window.toggleRowSelect = toggleRowSelect;
window.changePage = changePage;
window.handleStatusChange = handleStatusChange;
window.saveIssue = saveIssue;
window.filterTolTable = filterTolTable;

document.addEventListener('DOMContentLoaded', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const repInput = document.getElementById('formReportedDate');
    const clsInput = document.getElementById('formClosureDate');

    if (repInput) repInput.max = todayStr;
    if (clsInput) clsInput.max = todayStr;

    fetchIssues();
});

function isModuleMatch(issueModule, targetKey) {
    const itemMod = (issueModule || '').trim().toLowerCase();
    const target = (targetKey || '').trim().toLowerCase();

    if (!itemMod || !target) return false;
    if (target === 'all') return true;

    if (target.includes('channel')) return itemMod.includes('channel');
    if (target.includes('infra')) return itemMod.includes('infra');
    if (target.includes('eod') || target.includes('bod') || target.includes('eowd')) return itemMod.includes('eod') || itemMod.includes('bod') || itemMod.includes('eowd');
    if (target.includes('finacle') || target.includes('payment')) return itemMod.includes('finacle') || itemMod.includes('payment');
    if (target.includes('trade')) return itemMod.includes('trade');

    return itemMod.includes(target) || target.includes(itemMod);
}

function getNormalizedEntity(item) {
    const entity = (item.entity || '').trim().toUpperCase();
    const env = (item.environment || '').trim().toUpperCase();

    if (entity.includes('OVERSEAS') || env.includes('OVERSEAS') ||
        entity.includes('DUBAI') || entity.includes('BHUTAN') || entity.includes('PNB UK') || entity.includes('UK')) {
        return 'Overseas';
    }

    if (entity.includes('RRB') || env.includes('RRB') || 
        entity.includes('HGB') || entity.includes('PGB') || entity.includes('MGB') || 
        entity.includes('HMGB') || entity.includes('AGB') || entity.includes('BGB') || 
        entity.includes('MRB') || entity.includes('TGB') || entity.includes('SHGB') || 
        entity.includes('DBGB') || entity.includes('AGVB') || entity.includes('HPGB') || 
        entity.includes('BGVB') || entity.includes('DGGB') || entity.includes('BGBV')) {
        return 'RRB';
    }

    return 'Domestic';
}

function isClosedStatus(status) { 
    const s = (status || '').toLowerCase();
    return s.includes('closed'); 
}

function isOpenBankStatus(status) { 
    const s = (status || '').toLowerCase();
    return s.includes('bank') || s.includes('l2') || s.includes('open with bank') || s.includes('pending with bank'); 
}

function isOpenInfosysStatus(status) { 
    const s = (status || '').toLowerCase(); 
    return s.includes('infosys') || s.includes('l3') || s.includes('progress') || s.includes('pending with l3') || s.includes('work in progress'); 
}

function selectModule(moduleName) {
    currentModule = moduleName;
    currentSubSection = 'ALL';

    document.querySelectorAll('.module-card').forEach(btn => {
        const btnText = btn.innerText.trim();
        const matches = (moduleName === 'ALL' && btnText.includes('All Modules')) ||
                        (moduleName === 'MONTH_COUNT' && btnText.includes('Month Count')) ||
                        (moduleName === 'TOL_DETAILS' && btnText.includes('TOL Details')) ||
                        (btnText.toLowerCase().includes(moduleName.toLowerCase()));
        btn.classList.toggle('active', matches);
    });

    const monthCountSection = document.getElementById('monthCountPageSection');
    const tolDetailsSection = document.getElementById('tolDetailsPageSection');
    const tableSection = document.getElementById('issuesTableSection');
    const chartsSection = document.getElementById('chartsSection');
    const subTabsContainer = document.getElementById('subSectionTabs');

    if (moduleName === 'MONTH_COUNT') {
        monthCountSection.style.display = 'block';
        tolDetailsSection.style.display = 'none';
        tableSection.style.display = 'none';
        chartsSection.style.display = 'none';
        if (subTabsContainer) subTabsContainer.style.display = 'none';
        document.getElementById('activeFilterBadge').innerText = 'Month Count View';
        recalculateAllSummaryTables(allIssuesData);
    } else if (moduleName === 'TOL_DETAILS') {
        monthCountSection.style.display = 'none';
        tolDetailsSection.style.display = 'block';
        tableSection.style.display = 'none';
        chartsSection.style.display = 'none';
        if (subTabsContainer) subTabsContainer.style.display = 'none';
        document.getElementById('activeFilterBadge').innerText = 'TOL Sheet View';
        renderTolDetailsPage();
    } else {
        monthCountSection.style.display = 'none';
        tolDetailsSection.style.display = 'none';
        tableSection.style.display = 'block';
        chartsSection.style.display = 'grid';

        if (subTabsContainer) {
            subTabsContainer.style.display = 'flex';
            resetSubTabsUI();
        }

        const displayTitle = moduleName === 'ALL' ? 'All Modules Sheet' : `${moduleName} Sheet Data`;
        document.getElementById('activeFilterBadge').innerText = displayTitle;
        document.getElementById('tableHeading').innerText = displayTitle;
        if (document.getElementById('summaryHeading')) {
            document.getElementById('summaryHeading').innerText = moduleName === 'ALL' ? 'Overall Track Level Status Summary' : `${moduleName} Module Status Summary`;
        }

        applyFilters();
    }
}

function selectSubSection(subName) {
    currentSubSection = subName;

    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (subName === 'ALL' && document.getElementById('subTabAll')) document.getElementById('subTabAll').classList.add('active');
    if (subName === 'ACTIVITY' && document.getElementById('subTabActivity')) document.getElementById('subTabActivity').classList.add('active');
    if (subName === 'MONITORING' && document.getElementById('subTabMonitoring')) document.getElementById('subTabMonitoring').classList.add('active');
    if (subName === 'MODULE_SHEET' && document.getElementById('subTabModuleSheet')) document.getElementById('subTabModuleSheet').classList.add('active');
    if (subName === 'TOL' && document.getElementById('subTabTol')) document.getElementById('subTabTol').classList.add('active');

    const modLabel = currentModule === 'ALL' ? 'All Modules' : currentModule;
    let sectionLabel = 'All Section Data';
    if (subName === 'ACTIVITY') sectionLabel = 'Activity / Daily Sheet';
    if (subName === 'MONITORING') sectionLabel = 'Monitoring Sheet';
    if (subName === 'MODULE_SHEET') sectionLabel = 'Module Issues Sheet';
    if (subName === 'TOL') sectionLabel = 'TOL Tickets Sheet';

    document.getElementById('tableHeading').innerText = `${modLabel} ➔ ${sectionLabel}`;
    document.getElementById('activeFilterBadge').innerText = `${modLabel} (${sectionLabel})`;

    applyFilters();
}

function resetSubTabsUI() {
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (document.getElementById('subTabAll')) document.getElementById('subTabAll').classList.add('active');
}

function renderTolDetailsPage() { filterTolTable(); }

function filterTolTable() {
    const modFilter = (document.getElementById('tolModuleFilter')?.value || '').trim().toLowerCase();
    const stFilter = (document.getElementById('tolStatusFilter')?.value || '').trim().toLowerCase();
    const searchQuery = (document.getElementById('tolSearchInput')?.value || '').trim().toLowerCase();

    const getTolStatus = (st) => {
        if (isClosedStatus(st)) return 'Closed';
        if (isOpenBankStatus(st)) return 'Open with L2';
        if (isOpenInfosysStatus(st)) return 'Open with L3';
        return 'Open with L2';
    };

    let tolRecords = allIssuesData.filter(i => i.tolId && i.tolId.trim() !== '');
    if (tolRecords.length === 0) tolRecords = [...allIssuesData];

    let filteredTols = tolRecords.filter(item => {
        const itemTolStatus = getTolStatus(item.issueStatus);
        const matchesMod = !modFilter || isModuleMatch(item.module, modFilter);
        const matchesSt = !stFilter || itemTolStatus.toLowerCase() === stFilter;
        const matchesSearch = !searchQuery || 
            (item.tolId && item.tolId.toLowerCase().includes(searchQuery)) ||
            (item.issueDescription && item.issueDescription.toLowerCase().includes(searchQuery)) ||
            (item.assignee && item.assignee.toLowerCase().includes(searchQuery)) ||
            (item.l3Assignee && item.l3Assignee.toLowerCase().includes(searchQuery));

        return matchesMod && matchesSt && matchesSearch;
    });

    if (document.getElementById('tolTotalCount')) document.getElementById('tolTotalCount').innerText = filteredTols.length;
    if (document.getElementById('tolOpenL2Count')) document.getElementById('tolOpenL2Count').innerText = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Open with L2').length;
    if (document.getElementById('tolOpenL3Count')) document.getElementById('tolOpenL3Count').innerText = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Open with L3').length;
    if (document.getElementById('tolClosedCount')) document.getElementById('tolClosedCount').innerText = filteredTols.filter(i => getTolStatus(i.issueStatus) === 'Closed').length;

    const tbody = document.getElementById('tolTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredTols.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" style="text-align:center; color:#94a3b8;">No TOL ticket records found.</td></tr>`;
        return;
    }

    filteredTols.forEach(item => {
        const tolSt = getTolStatus(item.issueStatus);
        let statusBadgeClass = 'status-closed';
        if (tolSt === 'Open with L2') statusBadgeClass = 'status-bank';
        if (tolSt === 'Open with L3') statusBadgeClass = 'status-infosys';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><code><strong>${item.tolId || 'TOL-' + item.id}</strong></code></td>
            <td><strong>${item.module}</strong></td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.entity}</td>
            <td>${item.environment || 'PROD'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td>${item.assignee || '-'}${item.coAssignee ? ' / ' + item.coAssignee : ''}</td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td>${item.l3Assignee || '-'}</td>
            <td>${item.closureDate || '-'}</td>
            <td><span class="status-badge ${statusBadgeClass}">${tolSt}</span></td>
            <td><button type="button" class="action-btn edit-btn" onclick="window.editIssue(${item.id})">✏️ Edit</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function handleMonthCountFilterChange() {
    const selectedVal = document.getElementById('monthCountFilter').value;
    if (document.getElementById('monthFilter')) document.getElementById('monthFilter').value = selectedVal;
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];
    recalculateAllSummaryTables(allIssuesData);
}

function handleMonthChange() {
    const selectedVal = document.getElementById('monthFilter').value;
    if (document.getElementById('monthCountFilter')) document.getElementById('monthCountFilter').value = selectedVal;
    selectedMonths = selectedVal === "" ? [] : [parseInt(selectedVal, 10)];

    if (currentModule === 'MONTH_COUNT') recalculateAllSummaryTables(allIssuesData);
    else if (currentModule === 'TOL_DETAILS') renderTolDetailsPage();
    else applyFilters();
}

async function fetchIssues() {
    try {
        const res = await fetch(`${API_BASE_URL}`);
        if (res.ok) {
            allIssuesData = await res.json();
        } else {
            const stored = localStorage.getItem(STORAGE_KEY);
            allIssuesData = stored ? JSON.parse(stored) : getSampleData();
        }
    } catch (err) {
        const stored = localStorage.getItem(STORAGE_KEY);
        allIssuesData = stored ? JSON.parse(stored) : getSampleData();
    }

    applyFilters();
    recalculateAllSummaryTables(allIssuesData);
    if (currentModule === 'TOL_DETAILS') renderTolDetailsPage();
}

function getSampleData() {
    return [
        { id: 1, module: 'Channels', entity: 'PNB Domestic', environment: 'PROD', reportedDate: '2026-01-13', issueDescription: 'UNISER - PSP31 patch deployment activity support', l2Analysis: null, tolId: null, issueStatus: 'Closed', l3UpdatesRemarks: 'all channles are working fine in DC after patch deployment.', closureCategory: 'Not an Issue', closureDate: '2026-01-13', assignee: 'Barath', coAssignee: null, l3Assignee: null },
        { id: 2, module: 'Infra', entity: 'PNB Domestic', environment: 'PROD', reportedDate: '2026-07-13', issueDescription: 'DC - DR comparison sheet for Infra', l2Analysis: null, tolId: null, issueStatus: 'Closed', l3UpdatesRemarks: 'common.env, application.properties shared', closureCategory: 'Not an Issue', closureDate: '2026-07-13', assignee: 'Hari', coAssignee: 'Kabilarasan', l3Assignee: null }
    ];
}

function applyFilters() {
    const entity = (document.getElementById('filterEntity')?.value || '').trim().toLowerCase();
    const env = (document.getElementById('filterEnv')?.value || '').trim().toLowerCase();
    const status = (document.getElementById('filterStatus')?.value || '').trim().toLowerCase();
    const category = (document.getElementById('filterClosureCategory')?.value || '').trim().toLowerCase();
    const assignee = (document.getElementById('filterAssignee')?.value || '').trim();

    let dataset = [...allIssuesData];

    if (currentModule !== 'ALL' && currentModule !== 'MONTH_COUNT' && currentModule !== 'TOL_DETAILS') {
        dataset = dataset.filter(i => isModuleMatch(i.module, currentModule));
    }

    if (currentSubSection !== 'ALL') {
        dataset = dataset.filter(item => {
            const desc = (item.issueDescription || '').toLowerCase();
            const remarks = (item.l3UpdatesRemarks || '').toLowerCase();
            const hasTol = item.tolId && item.tolId.trim() !== '';

            if (currentSubSection === 'ACTIVITY') {
                return desc.includes('activity') || desc.includes('patch') || desc.includes('support') || desc.includes('deploy') || !hasTol;
            } else if (currentSubSection === 'MONITORING') {
                return desc.includes('monitor') || desc.includes('comparison') || desc.includes('script') || desc.includes('drill') || desc.includes('switch') || remarks.includes('comparison');
            } else if (currentSubSection === 'MODULE_SHEET') {
                return !hasTol;
            } else if (currentSubSection === 'TOL') {
                return hasTol;
            }
            return true;
        });
    }

    if (selectedMonths.length > 0) {
        dataset = dataset.filter(i => {
            if (!i.reportedDate) return false;
            const m = parseInt(i.reportedDate.split('-')[1], 10);
            return selectedMonths.includes(m);
        });
    }

    filteredIssuesData = dataset.filter(item => {
        let itemEntity = (item.entity || '').toLowerCase();
        let itemEnv = (item.environment || '').toLowerCase();
        let itemStatus = (item.issueStatus || '').toLowerCase();
        let itemCat = (item.closureCategory || '').toLowerCase();
        let itemAss = (item.assignee || '').toLowerCase() + (item.coAssignee || '').toLowerCase() + (item.l3Assignee || '').toLowerCase();

        let matchesEntity = !entity || itemEntity === entity || (entity === 'rrb' && getNormalizedEntity(item) === 'RRB') || (entity === 'overseas' && getNormalizedEntity(item) === 'Overseas');
        let matchesEnv = !env || itemEnv === env || itemEnv.includes(env);
        let matchesStatus = !status || itemStatus.includes(status) || (status.includes('bank') && isOpenBankStatus(item.issueStatus)) || (status.includes('infosys') && isOpenInfosysStatus(item.issueStatus)) || (status.includes('closed') && isClosedStatus(item.issueStatus));
        let matchesCat = !category || itemCat === category;
        let matchesAss = !assignee || itemAss.includes(assignee.toLowerCase());

        return matchesEntity && matchesEnv && matchesStatus && matchesCat && matchesAss;
    });

    currentPage = 1;
    renderPaginatedTable();
    updateCharts(filteredIssuesData);
    recalculateAllSummaryTables(dataset);
}

function recalculateAllSummaryTables(dataset) {
    const monthData = dataset.filter(i => {
        if (selectedMonths.length === 0) return true;
        if (!i.reportedDate) return false;
        const m = parseInt(i.reportedDate.split('-')[1], 10);
        return selectedMonths.includes(m);
    });

    let cDom = 0, cRrb = 0, cOvs = 0;
    let bDom = 0, bRrb = 0, bOvs = 0;
    let iDom = 0, iRrb = 0, iOvs = 0;

    monthData.forEach(item => {
        const normEnt = getNormalizedEntity(item);
        const st = item.issueStatus;

        if (isClosedStatus(st)) {
            if (normEnt === 'Domestic') cDom++;
            else if (normEnt === 'RRB') cRrb++;
            else if (normEnt === 'Overseas') cOvs++;
        } else if (isOpenBankStatus(st)) {
            if (normEnt === 'Domestic') bDom++;
            else if (normEnt === 'RRB') bRrb++;
            else if (normEnt === 'Overseas') bOvs++;
        } else if (isOpenInfosysStatus(st)) {
            if (normEnt === 'Domestic') iDom++;
            else if (normEnt === 'RRB') iRrb++;
            else if (normEnt === 'Overseas') iOvs++;
        }
    });

    document.getElementById('closedTotal').innerText = cDom + cRrb + cOvs;
    document.getElementById('closedDom').innerText = cDom;
    document.getElementById('closedRrb').innerText = cRrb;
    document.getElementById('closedOvs').innerText = cOvs;

    document.getElementById('bankTotal').innerText = bDom + bRrb + bOvs;
    document.getElementById('bankDom').innerText = bDom;
    document.getElementById('bankRrb').innerText = bRrb;
    document.getElementById('bankOvs').innerText = bOvs;

    document.getElementById('infTotal').innerText = iDom + iRrb + iOvs;
    document.getElementById('infDom').innerText = iDom;
    document.getElementById('infRrb').innerText = iRrb;
    document.getElementById('infOvs').innerText = iOvs;

    const modulesConfig = ['Infra', 'ADC Channels', 'Trade Finance', 'GBM', 'EOD/BOD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'];
    let issueDataRowsHtml = '';
    let trackLevelRowsHtml = '';

    let gCdom = 0, gCrrb = 0, gCovs = 0;
    let gIdom = 0, gIrrb = 0, gIovs = 0;
    let gBdom = 0, gBrrb = 0, gBovs = 0;

    modulesConfig.forEach(modName => {
        const modIssues = monthData.filter(i => isModuleMatch(i.module, modName));

        const mcDom = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const mcRrb = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const mcOvs = modIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totC = mcDom + mcRrb + mcOvs;

        const miDom = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const miRrb = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const miOvs = modIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totI = miDom + miRrb + miOvs;

        const mbDom = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
        const mbRrb = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
        const mbOvs = modIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;
        const totB = mbDom + mbRrb + mbOvs;

        const rowGrandTotal = totC + totI + totB;

        gCdom += mcDom; gCrrb += mcRrb; gCovs += mcOvs;
        gIdom += miDom; gIrrb += miRrb; gIovs += miOvs;
        gBdom += mbDom; gBrrb += mbRrb; gBovs += mbOvs;

        issueDataRowsHtml += `<tr><td><strong>${modName}</strong></td><td>${mcDom}</td><td>${mcRrb}</td><td>${mcOvs}</td><td>${miDom}</td><td>${miRrb}</td><td>${miOvs}</td><td>${mbDom}</td><td>${mbRrb}</td><td>${mbOvs}</td></tr>`;
        trackLevelRowsHtml += `<tr><td><strong>${modName}</strong></td><td><strong>${totC}</strong></td><td><strong>${totI}</strong></td><td><strong>${totB}</strong></td><td><strong>${rowGrandTotal}</strong></td></tr>`;
    });

    const overallClosed = gCdom + gCrrb + gCovs;
    const overallInf = gIdom + gIrrb + gIovs;
    const overallBank = gBdom + gBrrb + gBovs;
    const overallGrandTotal = overallClosed + overallInf + overallBank;

    issueDataRowsHtml += `<tr class="total-row"><td><strong>TOTAL</strong></td><td>${gCdom}</td><td>${gCrrb}</td><td>${gCovs}</td><td>${gIdom}</td><td>${gIrrb}</td><td>${gIovs}</td><td>${gBdom}</td><td>${gBrrb}</td><td>${gBovs}</td></tr>`;
    trackLevelRowsHtml += `<tr class="total-row"><td><strong>TOTAL</strong></td><td><strong>${overallClosed}</strong></td><td><strong>${overallInf}</strong></td><td><strong>${overallBank}</strong></td><td><strong>${overallGrandTotal}</strong></td></tr>`;

    if (document.getElementById('issueDataMatrixBody')) document.getElementById('issueDataMatrixBody').innerHTML = issueDataRowsHtml;
    if (document.getElementById('trackLevelStatusBody')) document.getElementById('trackLevelStatusBody').innerHTML = trackLevelRowsHtml;

    renderDomainTable('group1Body', monthData, ['Infra', 'ADC Channels', 'Channels']);
    renderDomainTable('group2Body', monthData, ['Finacle Payments', 'FAS', 'Payments']);
    renderDomainTable('group3Body', monthData, ['Trade Finance', 'GBM', 'EOD/BOD', 'EOD', 'BOD', 'Loans', 'Deposits', 'CRM']);

    const domTot = gCdom + gIdom + gBdom;
    const rrbTot = gCrrb + gIrrb + gBrrb;
    const ovsTot = gCovs + gIovs + gBovs;

    if (document.getElementById('grandSummaryBody')) {
        document.getElementById('grandSummaryBody').innerHTML = `
            <tr><td><strong>PNB Domestic</strong></td><td>${gCdom}</td><td>${gIdom}</td><td>${gBdom}</td><td><strong>${domTot}</strong></td></tr>
            <tr><td><strong>RRBs</strong></td><td>${gCrrb}</td><td>${gIrrb}</td><td>${gBrrb}</td><td><strong>${rrbTot}</strong></td></tr>
            <tr><td><strong>Overseas</strong></td><td>${gCovs}</td><td>${gIovs}</td><td>${gBdom}</td><td><strong>${ovsTot}</strong></td></tr>
            <tr class="total-row"><td><strong>TOTAL</strong></td><td><strong>${overallClosed}</strong></td><td><strong>${overallInf}</strong></td><td><strong>${overallBank}</strong></td><td><strong>${overallGrandTotal}</strong></td></tr>
        `;
    }
}

function renderDomainTable(elementId, monthData, modulesGroup) {
    const groupIssues = monthData.filter(i => modulesGroup.some(m => isModuleMatch(i.module, m)));

    const cDom = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const cRrb = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const cOvs = groupIssues.filter(i => isClosedStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const iDom = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const iRrb = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const iOvs = groupIssues.filter(i => isOpenInfosysStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const bDom = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Domestic').length;
    const bRrb = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'RRB').length;
    const bOvs = groupIssues.filter(i => isOpenBankStatus(i.issueStatus) && getNormalizedEntity(i) === 'Overseas').length;

    const tDom = cDom + iDom + bDom;
    const tRrb = cRrb + iRrb + bRrb;
    const tOvs = cOvs + iOvs + bOvs;

    const totC = cDom + cRrb + cOvs;
    const totI = iDom + iRrb + iOvs;
    const totB = bDom + bRrb + bOvs;
    const gTot = totC + totI + totB;

    const elem = document.getElementById(elementId);
    if (elem) {
        elem.innerHTML = `
            <tr><td>PNB Domestic</td><td>${cDom}</td><td>${iDom}</td><td>${bDom}</td><td><strong>${tDom}</strong></td></tr>
            <tr><td>RRBs</td><td>${cRrb}</td><td>${iRrb}</td><td>${bRrb}</td><td><strong>${tRrb}</strong></td></tr>
            <tr><td>Overseas</td><td>${cOvs}</td><td>${iOvs}</td><td>${bOvs}</td><td><strong>${tOvs}</strong></td></tr>
            <tr class="total-row"><td><strong>Total</strong></td><td><strong>${totC}</strong></td><td><strong>${totI}</strong></td><td><strong>${totB}</strong></td><td><strong>${gTot}</strong></td></tr>
        `;
    }
}

function toggleSelectAll(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    document.querySelectorAll('.row-checkbox').forEach(cb => {
        cb.checked = isChecked;
        const id = parseInt(cb.getAttribute('data-id'));
        if (isChecked) selectedRowIds.add(id);
        else selectedRowIds.delete(id);
    });
}

function toggleRowSelect(id, checkbox) {
    if (checkbox.checked) selectedRowIds.add(id);
    else selectedRowIds.delete(id);
}

function renderPaginatedTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const total = filteredIssuesData.length;
    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, total);
    const pageItems = filteredIssuesData.slice(startIdx, endIdx);

    document.getElementById('pageInfo').innerText = `Showing ${total === 0 ? 0 : startIdx + 1} to ${endIdx} of ${total} entries`;
    document.getElementById('currentPageNum').innerText = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;

    if (pageItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center; color:#94a3b8;">No issue records found for this module section.</td></tr>`;
        return;
    }

    pageItems.forEach(item => {
        let statusClass = 'status-closed';
        if (isOpenBankStatus(item.issueStatus)) statusClass = 'status-bank';
        if (isOpenInfosysStatus(item.issueStatus)) statusClass = 'status-infosys';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${item.id}" ${selectedRowIds.has(item.id) ? 'checked' : ''} onclick="window.toggleRowSelect(${item.id}, this)"></td>
            <td><strong>${item.module}</strong></td>
            <td>${item.entity}</td>
            <td>${item.environment || 'PROD'}</td>
            <td>${item.reportedDate || '-'}</td>
            <td>${item.issueDescription || '-'}</td>
            <td>${item.l2Analysis || '-'}</td>
            <td><code>${item.tolId || '-'}</code></td>
            <td>${item.l3UpdatesRemarks || '-'}</td>
            <td><span class="status-badge ${statusClass}">${item.issueStatus}</span></td>
            <td>${item.closureCategory || '-'}</td>
            <td>${item.closureDate || '-'}</td>
            <td>${item.assignee || '-'}${item.coAssignee ? ' / ' + item.coAssignee : ''}</td>
            <td>${item.l3Assignee || '-'}</td>
            <td style="white-space: nowrap;">
                <button type="button" class="action-btn edit-btn" onclick="window.editIssue(${item.id})">✏️ Edit</button>
                <button type="button" class="action-btn delete-btn" onclick="window.deleteIssue(${item.id})">🗑️ Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function changePage(delta) { currentPage += delta; renderPaginatedTable(); }

function filterTableBySearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    filteredIssuesData = allIssuesData.filter(i =>
        (i.issueDescription && i.issueDescription.toLowerCase().includes(query)) ||
        (i.tolId && i.tolId.toLowerCase().includes(query)) ||
        (i.assignee && i.assignee.toLowerCase().includes(query)) ||
        (i.coAssignee && i.coAssignee.toLowerCase().includes(query)) ||
        (i.l3Assignee && i.l3Assignee.toLowerCase().includes(query)) ||
        (i.module && i.module.toLowerCase().includes(query)) ||
        (i.entity && i.entity.toLowerCase().includes(query)) ||
        (i.environment && i.environment.toLowerCase().includes(query))
    );
    currentPage = 1;
    renderPaginatedTable();
}

function isCompleteDate(dateStr) {
    if (!dateStr || dateStr.length !== 10) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    return year >= 2000 && year <= 2100;
}

function validateDates() {
    const repInput = document.getElementById('formReportedDate');
    const clsInput = document.getElementById('formClosureDate');
    const statusInput = document.getElementById('formStatus');

    const repVal = repInput.value;
    const clsVal = clsInput.value;
    const statusVal = statusInput.value;
    const todayStr = new Date().toISOString().split('T')[0];

    clearDateError();

    if (!repVal) return showDateError("Reported Date is required.");
    if (isCompleteDate(repVal) && repVal > todayStr) return showDateError("Reported Date cannot be a future date.");
    if (isClosedStatus(statusVal) && !clsVal) return showDateError("Closure Date is required when Issue Status is 'Closed'.");

    if (clsVal && isCompleteDate(clsVal) && isCompleteDate(repVal)) {
        if (clsVal > todayStr) return showDateError("Closure Date cannot be a future date.");
        if (clsVal < repVal) return showDateError("Closure Date cannot be earlier than Reported Date.");
    }

    return true;
}

function handleStatusChange() {
    const statusVal = document.getElementById('formStatus').value;
    const closureDateInput = document.getElementById('formClosureDate');
    const closureCatInput = document.getElementById('formClosureCategory');

    closureCatInput.disabled = false;

    if (!isClosedStatus(statusVal)) {
        closureDateInput.value = '';
        closureDateInput.disabled = true;
    } else {
        closureDateInput.disabled = false;
    }
    clearDateError();
}

function showDateError(message) {
    let errorBox = document.getElementById('formErrorBanner');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'formErrorBanner';
        errorBox.className = 'error-banner';
        const form = document.getElementById('issueForm');
        form.insertBefore(errorBox, form.firstChild);
    }
    errorBox.innerHTML = `⚠️ <strong>Validation Error:</strong> ${message}`;
    errorBox.style.display = 'block';
    return false;
}

function clearDateError() {
    const errorBox = document.getElementById('formErrorBanner');
    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.innerHTML = '';
    }
}

function openModal() {
    document.getElementById('issueForm').reset();
    document.getElementById('formId').value = '';
    document.getElementById('formTitle').innerText = 'Add New Issue Details';
    clearDateError();
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('formReportedDate').max = todayStr;
    document.getElementById('formClosureDate').max = todayStr;

    handleStatusChange();
    document.getElementById('issueModal').classList.add('show');
}

function closeModal() { document.getElementById('issueModal').classList.remove('show'); }

function editIssue(id) {
    const item = allIssuesData.find(i => i.id === id);
    if (!item) return;

    clearDateError();
    document.getElementById('formId').value = item.id;
    document.getElementById('formModule').value = item.module;
    document.getElementById('formEntity').value = item.entity;
    document.getElementById('formEnv').value = item.environment || 'PROD';
    document.getElementById('formReportedDate').value = item.reportedDate;
    document.getElementById('formDescription').value = item.issueDescription;
    document.getElementById('formL2').value = item.l2Analysis || '';
    document.getElementById('formTolId').value = item.tolId || '';
    document.getElementById('formStatus').value = item.issueStatus;
    document.getElementById('formL3').value = item.l3UpdatesRemarks || '';
    document.getElementById('formClosureCategory').value = item.closureCategory || '';
    document.getElementById('formClosureDate').value = item.closureDate || '';
    document.getElementById('formAssignee').value = item.assignee || '';
    document.getElementById('formCoAssignee').value = item.coAssignee || '';
    if (document.getElementById('formL3Assignee')) document.getElementById('formL3Assignee').value = item.l3Assignee || '';

    handleStatusChange();
    document.getElementById('issueModal').classList.add('show');
}

async function saveIssue(e) {
    e.preventDefault();

    if (!validateDates()) return false;

    const rawId = document.getElementById('formId').value;
    const isEdit = rawId && rawId !== '' && rawId !== 'undefined' && rawId !== 'null';

    const issueData = {
        id: isEdit ? parseInt(rawId, 10) : Date.now(),
        module: document.getElementById('formModule').value,
        entity: document.getElementById('formEntity').value,
        environment: document.getElementById('formEnv').value || 'PROD',
        reportedDate: document.getElementById('formReportedDate').value,
        issueDescription: document.getElementById('formDescription').value,
        l2Analysis: document.getElementById('formL2').value || null,
        tolId: document.getElementById('formTolId').value || null,
        issueStatus: document.getElementById('formStatus').value,
        l3UpdatesRemarks: document.getElementById('formL3').value || null,
        closureCategory: document.getElementById('formClosureCategory').value || null,
        closureDate: document.getElementById('formClosureDate').value || null,
        assignee: document.getElementById('formAssignee').value || null,
        coAssignee: document.getElementById('formCoAssignee').value || null,
        l3Assignee: document.getElementById('formL3Assignee')?.value || null
    };

    try {
        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE_URL}/${rawId}` : API_BASE_URL;
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });

        if (res.ok) {
            closeModal();
            fetchIssues();
            return;
        }
    } catch (err) {
        console.warn('Backend REST API unavailable. Saving to browser storage.');
    }

    if (isEdit) {
        const idx = allIssuesData.findIndex(i => i.id === issueData.id);
        if (idx !== -1) allIssuesData[idx] = issueData;
    } else {
        allIssuesData.push(issueData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIssuesData));
    closeModal();
    fetchIssues();
}

async function deleteIssue(id) {
    if (!confirm('Are you sure you want to delete this issue record?')) return;
    try {
        await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.warn('Backend REST API unavailable. Deleting from browser storage.');
    }
    allIssuesData = allIssuesData.filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIssuesData));
    fetchIssues();
}

async function deleteAllRecords() {
    if (!confirm('⚠️ Are you sure you want to DELETE ALL issue records permanently?')) {
        return;
    }

    try {
        await fetch(`${API_BASE_URL}/all`, { method: 'DELETE' });
    } catch (err) {
        console.warn('Backend REST API unavailable. Clearing local storage records.');
    }

    allIssuesData = [];
    filteredIssuesData = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    selectedRowIds.clear();

    currentPage = 1;
    renderPaginatedTable();
    updateCharts([]);
    recalculateAllSummaryTables([]);
    if (document.getElementById('tolTableBody')) {
        document.getElementById('tolTableBody').innerHTML = '<tr><td colspan="13" style="text-align:center; color:#94a3b8;">No TOL ticket records found.</td></tr>';
    }

    alert('🗑️ All records have been successfully deleted.');
}

function openImportModal() {
    parsedExcelRecords = [];
    document.getElementById('excelFileInput').value = '';
    document.getElementById('importPreviewWrapper').style.display = 'none';
    document.getElementById('confirmImportBtn').style.display = 'none';
    document.getElementById('importStatusBanner').style.display = 'none';
    document.getElementById('importModal').classList.add('show');
}

function closeImportModal() { document.getElementById('importModal').classList.remove('show'); }

function parseExcelDate(rawDate) {
    if (!rawDate) return new Date().toISOString().split('T')[0];

    if (rawDate instanceof Date && !isNaN(rawDate)) {
        const y = rawDate.getFullYear();
        const m = String(rawDate.getMonth() + 1).padStart(2, '0');
        const d = String(rawDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    if (typeof rawDate === 'number') {
        const dateObj = XLSX.SSF.parse_date_code(rawDate);
        if (dateObj) {
            const y = dateObj.y;
            const m = String(dateObj.m).padStart(2, '0');
            const d = String(dateObj.d).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    }

    const str = String(rawDate).trim();
    if (!str) return new Date().toISOString().split('T')[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const monthTextMatch = str.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/](\d{4})$/);
    if (monthTextMatch) {
        const d = String(monthTextMatch[1]).padStart(2, '0');
        const m = monthNames[monthTextMatch[2].toLowerCase()] || '01';
        const y = monthTextMatch[3];
        return `${y}-${m}-${d}`;
    }

    const numericMatch = str.split(/[\/\-\.\s]+/);
    if (numericMatch.length === 3) {
        if (numericMatch[2].length === 4) {
            const d = String(numericMatch[0]).padStart(2, '0');
            const m = String(numericMatch[1]).padStart(2, '0');
            const y = numericMatch[2];
            return `${y}-${m}-${d}`;
        } else if (numericMatch[0].length === 4) {
            return str;
        }
    }

    return new Date().toISOString().split('T')[0];
}

function handleExcelFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            
            let combinedRecords = [];

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (jsonRows && jsonRows.length > 0) {
                    const sheetRecords = jsonRows
                        .filter(row => {
                            const desc = row['Activity Description'] || row['activity description'] || row['Description'] || row['issue'] || row['TOL Description'] || '';
                            const mod = row['Module'] || row['module'] || sheetName;
                            return String(desc).trim() !== '' || String(mod).trim() !== '';
                        })
                        .map((row, idx) => {
                            const getVal = (keys) => {
                                for (let k of keys) {
                                    const foundKey = Object.keys(row).find(rk => rk.toLowerCase().trim().replace(/_/g, ' ') === k.toLowerCase());
                                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
                                        return String(row[foundKey]).trim();
                                    }
                                }
                                return '';
                            };

                            let exactModule = getVal(['module', 'module name']);
                            if (!exactModule) {
                                exactModule = sheetName;
                                if (sheetName.toLowerCase().includes('activit') || sheetName.toLowerCase().includes('dail') || sheetName.toLowerCase().includes('monitor')) {
                                    exactModule = 'Channels';
                                } else if (sheetName.toLowerCase().includes('infra')) {
                                    exactModule = 'Infra';
                                }
                            }

                            return {
                                id: Date.now() + Math.floor(Math.random() * 1000) + idx,
                                module: exactModule,
                                entity: getVal(['entity']) || 'PNB Domestic',
                                environment: getVal(['environment', 'env']) || 'PROD',
                                reportedDate: parseExcelDate(getVal(['start date', 'startdate', 'reported date', 'reporteddate', 'date', 'tol raise date'])),
                                issueDescription: getVal(['activity description', 'activitydescription', 'issue description', 'description', 'issue', 'tol description']) || 'Activity Record',
                                l2Analysis: getVal(['l2 analysis', 'l2', 'l2 remarks']) || null,
                                tolId: getVal(['tol id', 'tolid', 'tol']) || null,
                                issueStatus: getVal(['status', 'issue status', 'issue_status', 'tol status']) || 'Closed',
                                l3UpdatesRemarks: getVal(['remarks', 'l3 updates', 'l3 updates remarks', 'l3', 'l3 remarks']) || null,
                                closureCategory: getVal(['closure category', 'category']) || null,
                                closureDate: getVal(['closure date', 'closuredate', 'tol closed date']) ? parseExcelDate(getVal(['closure date', 'closuredate', 'tol closed date'])) : null,
                                assignee: getVal(['assignee', 'l2 assignee']) || null,
                                coAssignee: getVal(['co-assignee', 'co assignee', 'coassignee']) || null,
                                l3Assignee: getVal(['l3 assignee', 'l3assignee']) || null
                            };
                        });

                    combinedRecords = [...combinedRecords, ...sheetRecords];
                }
            });

            if (combinedRecords.length === 0) {
                showImportStatus('⚠️ No valid rows found in any sheet tab of the selected Excel file.', 'danger');
                return;
            }

            parsedExcelRecords = combinedRecords;
            renderImportPreview(parsedExcelRecords);
            showImportStatus(`✅ Successfully parsed ${parsedExcelRecords.length} records across Excel sheet tabs (${workbook.SheetNames.join(', ')}). Click below to import.`, 'success');
            document.getElementById('confirmImportBtn').style.display = 'inline-block';

        } catch (err) {
            showImportStatus('❌ Failed to read Excel workbook: ' + err.message, 'danger');
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderImportPreview(records) {
    const tbody = document.getElementById('importPreviewBody');
    tbody.innerHTML = '';
    document.getElementById('parsedRowsCount').innerText = records.length;

    records.slice(0, 10).forEach((rec, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${rec.module}</strong></td>
            <td>${rec.entity}</td>
            <td>${rec.environment}</td>
            <td>${rec.reportedDate}</td>
            <td>${rec.issueDescription.substring(0, 30)}...</td>
            <td>${rec.issueStatus}</td>
            <td>${rec.assignee || '-'}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('importPreviewWrapper').style.display = 'block';
}

function showImportStatus(msg, type) {
    const banner = document.getElementById('importStatusBanner');
    banner.innerHTML = msg;
    banner.style.display = 'block';
    if (type === 'success') {
        banner.style.background = 'rgba(16, 185, 129, 0.2)';
        banner.style.color = '#34d399';
        banner.style.border = '1px solid #10b981';
    } else {
        banner.style.background = 'rgba(239, 68, 68, 0.2)';
        banner.style.color = '#f87171';
        banner.style.border = '1px solid #ef4444';
    }
}

async function confirmImport() {
    if (!parsedExcelRecords || parsedExcelRecords.length === 0) return;

    try {
        const res = await fetch(`${API_BASE_URL}/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedExcelRecords)
        });
        if (res.ok) {
            closeImportModal();
            fetchIssues();
            alert(`🎉 Successfully imported ${parsedExcelRecords.length} records!`);
            return;
        }
    } catch (err) {
        console.warn('Backend REST API batch endpoint unavailable. Saving batch to local storage.');
    }

    allIssuesData = [...allIssuesData, ...parsedExcelRecords];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIssuesData));

    closeImportModal();
    fetchIssues();
    alert(`🎉 Successfully imported ${parsedExcelRecords.length} records!`);
}

function exportToCSV() {
    if (filteredIssuesData.length === 0) {
        alert('No data available to export.');
        return;
    }

    const headers = ["ID", "Module", "Entity", "Environment", "Reported Date", "Issue Description", "L2 Analysis", "TOL ID", "L3 Updates", "Status", "Closure Category", "Closure Date", "Assignee", "Co-Assignee", "L3 Assignee"];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    filteredIssuesData.forEach(row => {
        const rowData = [
            row.id,
            `"${row.module || ''}"`,
            `"${row.entity || ''}"`,
            `"${row.environment || ''}"`,
            `"${row.reportedDate || ''}"`,
            `"${(row.issueDescription || '').replace(/"/g, '""')}"`,
            `"${(row.l2Analysis || '').replace(/"/g, '""')}"`,
            `"${row.tolId || ''}"`,
            `"${(row.l3UpdatesRemarks || '').replace(/"/g, '""')}"`,
            `"${row.issueStatus || ''}"`,
            `"${row.closureCategory || ''}"`,
            `"${row.closureDate || ''}"`,
            `"${row.assignee || ''}"`,
            `"${row.coAssignee || ''}"`,
            `"${row.l3Assignee || ''}"`
        ];
        csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Infra_Channels_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetAllFilters() {
    if (document.getElementById('monthFilter')) document.getElementById('monthFilter').value = '';
    if (document.getElementById('monthCountFilter')) document.getElementById('monthCountFilter').value = '';
    if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = '';
    if (document.getElementById('filterEntity')) document.getElementById('filterEntity').value = '';
    if (document.getElementById('filterEnv')) document.getElementById('filterEnv').value = '';
    if (document.getElementById('filterClosureCategory')) document.getElementById('filterClosureCategory').value = '';
    if (document.getElementById('filterAssignee')) document.getElementById('filterAssignee').value = '';
    if (document.getElementById('searchInput')) document.getElementById('searchInput').value = '';
    selectedMonths = [];
    selectModule('ALL');
}

function updateCharts(data) {
    if (typeof Chart === 'undefined') return;

    const closedCount = data.filter(i => isClosedStatus(i.issueStatus)).length;
    const bankCount = data.filter(i => isOpenBankStatus(i.issueStatus)).length;
    const infCount = data.filter(i => isOpenInfosysStatus(i.issueStatus)).length;

    const ctxPie = document.getElementById('statusPieChart')?.getContext('2d');
    if (ctxPie) {
        if (statusChart) statusChart.destroy();
        statusChart = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Closed', 'Open with Bank', 'Open with Infosys & L3'],
                datasets: [{
                    data: [closedCount, bankCount, infCount],
                    backgroundColor: ['#10b981', '#f59e0b', '#3b82f6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } }
            }
        });
    }

    const modulesList = ['Channels', 'Infra', 'Trade Finance', 'GBM', 'EOD/BOD', 'Loans', 'Deposits', 'CRM', 'Finacle Payments', 'FAS'];
    const moduleCounts = modulesList.map(m => data.filter(i => isModuleMatch(i.module, m)).length);

    const ctxBar = document.getElementById('moduleBarChart')?.getContext('2d');
    if (ctxBar) {
        if (moduleChart) moduleChart.destroy();
        moduleChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: modulesList,
                datasets: [{
                    label: 'Total Issues',
                    data: moduleCounts,
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}
