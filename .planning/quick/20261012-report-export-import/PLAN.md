# Report Export and Historical Import

## Goal

Add local report exports and a safe import path for historical sales spreadsheets without changing the existing offline-first storage model.

## Scope

- Export selected-day or current-month report data as a three-sheet XLSX workbook, CSV, or print-ready PDF.
- Add an Excel/CSV import preview that maps common sales headers, identifies invalid and likely duplicate rows, and imports historical orders only after explicit confirmation.
- Download a JSON backup before import; never change inventory during historical import.

## Implementation

1. Add report export and import controls to the reports screen.
2. Implement local XLSX generation/parsing and CSV processing without a runtime CDN dependency.
3. Validate the export archive, import preview, duplicate detection, and the app's runtime scripts.

## Acceptance Criteria

- Calendar/list exports include the current report month; day-detail exports are limited to the selected date.
- XLSX contains daily sales, mine orders, and financial summary sheets; CSV and print/PDF provide practical alternatives.
- Import supports `.xlsx`, `.csv`, and `.tsv`, previews mapped rows, skips invalid/possible duplicate rows by default, and preserves current inventory.
- Import backs up current data before adding rows, and imported records receive unique IDs.
