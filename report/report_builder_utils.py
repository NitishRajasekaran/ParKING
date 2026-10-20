"""
ParKING Project Report Generator
Generates ParKING_Project_Report.docx adhering strictly to Anna University / Easwari Engineering College academic standards.
Target: 50-55 pages, A4 size, Times New Roman 12 pt, 1-inch margins, justified paragraphs.
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Mm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOCX_OUTPUT_PATH = r"e:\Projects\ParKING\report\ParKING_Project_Report.docx"
SCREENSHOT_DIR = r"e:\Projects\ParKING\report\screenshots"
DIAGRAM_DIR = r"e:\Projects\ParKING\report\diagrams"

def set_cell_border(cell, **kwargs):
    """
    kwargs can be top, bottom, left, right with dict(sz=12, val='single', color='CBD5E1')
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(r'<w:tcBorders {}/>'.format(nsdecls('w')))
    for border_name, border_attrs in kwargs.items():
        tag = 'w:{}'.format(border_name)
        element = parse_xml(r'<{} {} w:val="{}" w:sz="{}" w:space="0" w:color="{}"/>'.format(
            tag, nsdecls('w'),
            border_attrs.get('val', 'single'),
            border_attrs.get('sz', '4'),
            border_attrs.get('color', 'CBD5E1')
        ))
        tcBorders.append(element)
    tcPr.append(tcBorders)

def set_cell_shading(cell, color_hex):
    shading_xml = f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>'
    cell._tc.get_or_add_tcPr().append(parse_xml(shading_xml))

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(r'<w:tcMar {}><w:top w:w="{}" w:type="dxa"/><w:bottom w:w="{}" w:type="dxa"/><w:left w:w="{}" w:type="dxa"/><w:right w:w="{}" w:type="dxa"/></w:tcMar>'.format(
        nsdecls('w'), top, bottom, left, right
    ))
    tcPr.append(tcMar)

def add_header_footer(doc):
    for s_idx, section in enumerate(doc.sections):
        # Configure margins: 1 inch = 1440 dxa
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.page_width = Mm(210)
        section.page_height = Mm(297)

        # Header
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("ParKING: Smart Real-Time Parking Management System")
        hrun.font.name = "Times New Roman"
        hrun.font.size = Pt(8.5)
        hrun.font.italic = True
        hrun.font.color.rgb = RGBColor(100, 116, 139)

        # Footer with page number field
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Easwari Engineering College | Department of CSE")
        frun.font.name = "Times New Roman"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(100, 116, 139)

def style_paragraph(p, space_before=0, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing

def add_body_p(doc, text, bold_prefix="", space_after=4):
    p = doc.add_paragraph()
    style_paragraph(p, space_after=space_after)
    if bold_prefix:
        r_bold = p.add_run(bold_prefix)
        r_bold.font.name = "Times New Roman"
        r_bold.font.size = Pt(12)
        r_bold.font.bold = True
        r_bold.font.color.rgb = RGBColor(15, 23, 42)
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(30, 41, 59)
    return p

def add_heading_1(doc, text, page_break=True):
    if page_break:
        doc.add_page_break()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(16)
    r.font.bold = True
    r.font.color.rgb = RGBColor(15, 23, 42)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(13.5)
    r.font.bold = True
    r.font.color.rgb = RGBColor(30, 58, 138)
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.font.name = "Times New Roman"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = RGBColor(51, 65, 85)
    return p

def add_code_box(doc, code_text, caption=""):
    if caption:
        p_cap = doc.add_paragraph()
        style_paragraph(p_cap, space_before=6, space_after=2, align=WD_ALIGN_PARAGRAPH.LEFT)
        p_cap.paragraph_format.keep_with_next = True
        r_cap = p_cap.add_run(caption)
        r_cap.font.name = "Times New Roman"
        r_cap.font.size = Pt(10)
        r_cap.font.bold = True
        r_cap.font.color.rgb = RGBColor(30, 41, 59)

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, "F8FAFC")
    set_cell_border(cell,
                    top=dict(val='single', sz=6, color='CBD5E1'),
                    bottom=dict(val='single', sz=6, color='CBD5E1'),
                    left=dict(val='single', sz=18, color='2563EB'), # Blue accent border on left
                    right=dict(val='single', sz=6, color='CBD5E1'))
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)

    cell_p = cell.paragraphs[0]
    cell_p.paragraph_format.space_before = Pt(0)
    cell_p.paragraph_format.space_after = Pt(0)
    cell_p.paragraph_format.line_spacing = 1.05
    cell_p.alignment = WD_ALIGN_PARAGRAPH.LEFT

    r = cell_p.add_run(code_text.strip())
    r.font.name = "Consolas"
    r.font.size = Pt(8.5)
    r.font.color.rgb = RGBColor(30, 41, 59)

def add_styled_table(doc, headers, data, col_widths=None, table_title=""):
    if table_title:
        p_title = doc.add_paragraph()
        style_paragraph(p_title, space_before=6, space_after=3, align=WD_ALIGN_PARAGRAPH.CENTER)
        p_title.paragraph_format.keep_with_next = True
        r_title = p_title.add_run(table_title)
        r_title.font.name = "Times New Roman"
        r_title.font.size = Pt(10)
        r_title.font.bold = True
        r_title.font.color.rgb = RGBColor(15, 23, 42)

    tbl = doc.add_table(rows=len(data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER

    # Format header
    hdr_cells = tbl.rows[0].cells
    for i, h_text in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_shading(cell, "1E3A8A") # Navy blue
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        set_cell_border(cell,
                        top=dict(val='single', sz=6, color='1E3A8A'),
                        bottom=dict(val='single', sz=12, color='0F172A'),
                        left=dict(val='single', sz=4, color='3B82F6'),
                        right=dict(val='single', sz=4, color='3B82F6'))
        p = cell.paragraphs[0]
        style_paragraph(p, space_before=0, space_after=0, line_spacing=1.05, align=WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(h_text)
        r.font.name = "Times New Roman"
        r.font.size = Pt(9.0)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    # Format body rows
    for r_idx, row_data in enumerate(data):
        row_cells = tbl.rows[r_idx + 1].cells
        bg_color = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, cell_value in enumerate(row_data):
            cell = row_cells[c_idx]
            set_cell_shading(cell, bg_color)
            set_cell_margins(cell, top=60, bottom=60, left=100, right=100)
            set_cell_border(cell,
                            top=dict(val='single', sz=4, color='E2E8F0'),
                            bottom=dict(val='single', sz=4, color='E2E8F0'),
                            left=dict(val='single', sz=4, color='E2E8F0'),
                            right=dict(val='single', sz=4, color='E2E8F0'))
            p = cell.paragraphs[0]
            # First column or numeric ID centered, others left aligned
            align = WD_ALIGN_PARAGRAPH.CENTER if (c_idx == 0 or len(str(cell_value)) < 5) else WD_ALIGN_PARAGRAPH.LEFT
            style_paragraph(p, space_before=0, space_after=0, line_spacing=1.05, align=align)
            r = p.add_run(str(cell_value))
            r.font.name = "Times New Roman"
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(30, 41, 59)

    # Set column widths if provided
    if col_widths:
        for row in tbl.rows:
            for idx, width in enumerate(col_widths):
                row.cells[idx].width = width

    return tbl

def add_figure(doc, image_path, caption="", width=Inches(4.1)):
    if not os.path.exists(image_path):
        p_err = doc.add_paragraph()
        style_paragraph(p_err, space_before=4, space_after=4, align=WD_ALIGN_PARAGRAPH.CENTER)
        r_err = p_err.add_run(f"[FIGURE NOT FOUND: {os.path.basename(image_path)}]")
        r_err.font.color.rgb = RGBColor(220, 38, 38)
        return

    p_img = doc.add_paragraph()
    style_paragraph(p_img, space_before=4, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
    p_img.paragraph_format.keep_with_next = True
    run_img = p_img.add_run()
    run_img.add_picture(image_path, width=width)

    if caption:
        p_cap = doc.add_paragraph()
        style_paragraph(p_cap, space_before=2, space_after=6, align=WD_ALIGN_PARAGRAPH.CENTER)
        r_cap = p_cap.add_run(caption)
        r_cap.font.name = "Times New Roman"
        r_cap.font.size = Pt(10)
        r_cap.font.bold = True
        r_cap.font.color.rgb = RGBColor(30, 41, 59)

print("Report generator utilities loaded successfully.")
