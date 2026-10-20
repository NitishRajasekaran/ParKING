$docxPath = "E:\Projects\ParKING\report\ParKING_Project_Report.docx"
$pdfPath = "E:\Projects\ParKING\report\ParKING_Project_Report.pdf"

if (!(Test-Path $docxPath)) {
    Write-Error "DOCX file not found at $docxPath"
    exit 1
}

Write-Output "Opening Word Application via COM..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = [Microsoft.Office.Interop.Word.WdAlertLevel]::wdAlertsNone

try {
    Write-Output "Opening document: $docxPath"
    $doc = $word.Documents.Open($docxPath)

    Write-Output "Updating document fields and page numbers..."
    $doc.Fields.Update()

    # Compute page statistics
    # wdStatisticPages = 2
    $pageCount = $doc.ComputeStatistics(2)
    Write-Output "Total Document Pages: $pageCount"

    # Export to PDF (wdFormatPDF = 17)
    $wdFormatPDF = 17
    Write-Output "Exporting to PDF: $pdfPath"
    $doc.SaveAs([ref]$pdfPath, [ref]$wdFormatPDF)

    $doc.Close([ref]$false)
    Write-Output "SUCCESS: PDF successfully generated!"
    Write-Output "DOCX Page Count: $pageCount"
} catch {
    Write-Error "Error during Word processing: $_"
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
