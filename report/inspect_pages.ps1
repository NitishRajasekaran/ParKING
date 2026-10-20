$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open('E:\Projects\ParKING\report\ParKING_Project_Report.docx')
$paras = $doc.Paragraphs
$headings = @()
for ($i = 1; $i -le $paras.Count; $i++) {
    $p = $paras.Item($i)
    $text = $p.Range.Text.Trim()
    if ($text -match '^(CHAPTER|APPENDICES|REFERENCES|ABSTRACT|TABLE OF CONTENTS|LIST OF)') {
        $page = $p.Range.Information(3) # 3 = wdActiveEndPageNumber
        $headings += "Page $page : $text"
    }
}
$doc.Close([ref]$false)
$word.Quit()
$headings
