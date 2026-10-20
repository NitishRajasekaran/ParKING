$word = New-Object -ComObject Word.Application
$word.Visible = $false
Write-Output "Word version: $($word.Version)"
$doc = $word.Documents.Add()
$doc.Content.Text = "ParKING Project Report Test"
$pdfPath = "E:\Projects\ParKING\test_word.pdf"
$wdFormatPDF = 17
$doc.SaveAs([ref]$pdfPath, [ref]$wdFormatPDF)
$pageCount = $doc.ComputeStatistics(2)
$doc.Close([ref]$false)
$word.Quit()
Write-Output "PDF created: $(Test-Path $pdfPath), Pages: $pageCount"
if (Test-Path $pdfPath) { Remove-Item -Force $pdfPath }
