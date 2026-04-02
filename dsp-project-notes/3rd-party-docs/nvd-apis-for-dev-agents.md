# NVD APIs for Dev Agents

Source collection: https://documenter.getpostman.com/view/16438573/UzXKWe99  
Collection name: `NVD APIs`  
Extracted on: 2026-04-02

## 1) Scope

This collection contains two API generations:

- `v1` endpoints under `/rest/json/*/1.0` (legacy style).
- `v2` endpoints under `/rest/json/*/2.0` (newer NVD APIs).

## 2) Auth and Base URL

Base URL for all endpoints:

- `https://services.nvd.nist.gov/rest/json`

API key:

- Required for practical usage/rate limits.
- Collection uses query parameter `apiKey=APIKEY` in v1.
- Collection models v2 with Postman `apikey` auth using key `apiKey` and value `APIKEY`.
- Safe default for clients: send `apiKey` as query param unless your integration layer uses header-based auth configured elsewhere.

## 3) Endpoint Catalog

## v1 Endpoints

### GET `/cve/1.0/:CVE`

Purpose: Retrieve one specific CVE.

Path params:

- `CVE` (example: `CVE-2021-41172`) in format `CVE-YYYY-NNNNN`.

Query params:

- `apiKey` (required in examples).
- `addOns` (`dictionaryCpes` to include official dictionary CPE names and denser response payloads).

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cve/1.0/CVE-2022-29098' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'addOns=dictionaryCpes'
```

### GET `/cves/1.0/`

Purpose: Retrieve a collection of CVEs with filtering.

Common query params from the collection:

- `apiKey`
- `addOns` (`dictionaryCpes`)
- `cpeMatchString`
- `cpeName`
- `cvssV2Metrics`, `cvssV2Severity`
- `cvssV3Metrics`, `cvssV3Severity`
- `cweId`
- `includeMatchStringChange`
- `isExactMatch`
- `keyword`
- `modStartDate`, `modEndDate`
- `pubStartDate`, `pubEndDate`
- `resultsPerPage` (example shows `500`; notes max `2000`)
- `sortOrder`
- `startIndex`

Date-window behavior (from collection notes):

- `modStartDate` and `modEndDate` must be provided together.
- `pubStartDate` and `pubEndDate` must be provided together.
- Maximum range: 120 consecutive days.

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cves/1.0/' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'keyword=openssl' \
  --data-urlencode 'resultsPerPage=100' \
  --data-urlencode 'startIndex=0'
```

### GET `/cpes/1.0/`

Purpose: Retrieve CPE records with optional linked CVEs.

Common query params from the collection:

- `apiKey`
- `addOns` (`cves` to include vulnerabilities associated with each CPE)
- `cpeMatchString`
- `includeDeprecated`
- `keyword`
- `modStartDate`, `modEndDate`
- `resultsPerPage`
- `startIndex`

Date-window behavior:

- `modStartDate` and `modEndDate` must be provided together.
- Maximum range: 120 consecutive days.

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cpes/1.0/' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'keyword=apple' \
  --data-urlencode 'resultsPerPage=100' \
  --data-urlencode 'startIndex=0'
```

## v2 Endpoints

### GET `/cves/2.0`

Purpose: Query CVE records in v2.

Parameters present in collection examples:

- `cpeName`
- `cveId`
- `cvssV2Metrics`, `cvssV2Severity`
- `cvssV3Metrics`, `cvssV3Severity`
- `cweId`
- `hasCertAlerts`, `hasCertNotes`, `hasKev`, `hasOval`
- `isVulnerable`
- `keywordExactMatch`, `keywordSearch`
- `lastModStartDate`, `lastModEndDate`
- `pubStartDate`, `pubEndDate`
- `resultsPerPage`
- `startIndex`
- `sourceIdentifier`
- `versionStart`, `versionStartType`
- `versionEnd`, `versionEndType`
- `virtualMatchString`

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cves/2.0' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'cveId=CVE-2019-1010218'
```

### GET `/cpes/2.0`

Purpose: Query CPE dictionary entries in v2.

Parameters in collection examples:

- `cpeNameId`
- `cpeMatchString`
- `keywordExactMatch`
- `keywordSearch`
- `lastModStartDate`, `lastModEndDate`
- `matchCriteriaId`
- `resultsPerPage` (collection note: up to `10000`)
- `startIndex`

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cpes/2.0' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'keywordSearch=Microsoft Windows' \
  --data-urlencode 'resultsPerPage=50'
```

### GET `/cpematch/2.0`

Purpose: Query CPE match criteria records.

Parameters in collection examples:

- `cveId`
- `lastModStartDate`, `lastModEndDate`
- `matchCriteriaId`
- `resultsPerPage` (collection note: up to `5000`)
- `startIndex`

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cpematch/2.0' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'cveId=CVE-2022-32223'
```

### GET `/cvehistory/2.0/`

Purpose: Query CVE change history.

Parameters in collection examples:

- `changeStartDate`
- `changeEndDate`
- `cveId`
- `eventName`
- `resultsPerPage`
- `startIndex`

Example:

```bash
curl --get \
  'https://services.nvd.nist.gov/rest/json/cvehistory/2.0/' \
  --data-urlencode 'apiKey=YOUR_API_KEY' \
  --data-urlencode 'cveId=CVE-2019-1010218'
```

## 4) Pagination Pattern (Agent Implementation)

Use this loop for collection endpoints:

1. Start with `startIndex=0`.
2. Set a controlled `resultsPerPage` (for example 100-500).
3. Read `totalResults` from response.
4. Increment `startIndex += resultsPerPage` until `startIndex >= totalResults`.

## 5) Date Filtering Guardrails

Implement input validation in agents before request dispatch:

- If one side of a date pair is set, require the other.
- Reject date ranges > 120 days for parameters that enforce this.
- Use fully qualified ISO datetimes (examples in collection use timezone offsets and URL encoding).

## 6) Practical Notes for Dev Agents

- Prefer v2 endpoints for new implementations.
- Keep v1 only for compatibility with existing downstream logic.
- Persist request metadata (`endpoint`, `query`, `timestamp`) for reproducibility.
- Treat optional boolean-ish query toggles (`hasKev`, `keywordExactMatch`, etc.) as explicit flags and avoid sending empty parameters unless intentionally required.
- Add retries and exponential backoff around upstream 429/5xx responses.

## 7) Collection Provenance

Extracted from Postman collection metadata:

- `ownerId`: `16438573`
- `collectionId`: `c7909178-e3f5-4139-8905-5cc381af70df`
- `publishedId`: `UzXKWe99`
- `publishDate`: `2022-07-23T11:06:28.000Z`

