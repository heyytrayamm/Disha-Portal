import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from typing import Dict, Any

class PDFReportGenerator:
    """
    Generates official downloadable PDF inspection report for scanned product labels.
    """

    @staticmethod
    def generate_inspection_pdf(product_data: Dict[str, Any], output_path: str) -> str:
        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'HeaderTitle',
            parent=styles['Heading1'],
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#1E3A8A'),
            alignment=1, # Center
            fontName='Helvetica-Bold'
        )

        subtitle_style = ParagraphStyle(
            'HeaderSubTitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#4B5563'),
            alignment=1,
            fontName='Helvetica-Oblique'
        )

        section_heading = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            fontName='Helvetica-Bold',
            spaceBefore=10,
            spaceAfter=6
        )

        normal_style = ParagraphStyle(
            'ReportText',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#334155')
        )

        # Header Block
        story.append(Paragraph("GOVERNMENT OF INDIA - DEPARTMENT OF CONSUMER AFFAIRS", title_style))
        story.append(Paragraph("DIRECTORATE OF LEGAL METROLOGY - INSPECTION REPORT", subtitle_style))
        story.append(Paragraph("Under Legal Metrology Act, 2009 & Packaged Commodities Rules, 2011", subtitle_style))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1E3A8A'), spaceAfter=15))

        # Overview Table
        status_color = colors.HexColor('#16A34A') if product_data.get('overallStatus') == 'COMPLIANT' else colors.HexColor('#DC2626')
        
        overview_data = [
            [
                Paragraph("<b>Inspection ID:</b>", normal_style), Paragraph(str(product_data.get('id')), normal_style),
                Paragraph("<b>Inspection Date:</b>", normal_style), Paragraph(str(product_data.get('scannedAt', ''))[:10], normal_style)
            ],
            [
                Paragraph("<b>Product Name:</b>", normal_style), Paragraph(str(product_data.get('productName')), normal_style),
                Paragraph("<b>Overall Status:</b>", normal_style), Paragraph(f"<font color='{status_color.hexval()}'><b>{product_data.get('overallStatus')}</b></font>", normal_style)
            ],
            [
                Paragraph("<b>Brand / Category:</b>", normal_style), Paragraph(f"{product_data.get('brandName')} ({product_data.get('category')})", normal_style),
                Paragraph("<b>Compliance Score:</b>", normal_style), Paragraph(f"<b>{product_data.get('overallScore')}%</b>", normal_style)
            ],
            [
                Paragraph("<b>Manufacturer:</b>", normal_style), Paragraph(str(product_data.get('manufacturerName')), normal_style),
                Paragraph("<b>Inspector:</b>", normal_style), Paragraph(f"{product_data.get('inspectorName')} ({product_data.get('inspectorLocation')})", normal_style)
            ]
        ]

        overview_table = Table(overview_data, colWidths=[110, 160, 110, 160])
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 15))

        # Section 2: Extracted Mandatory Fields
        story.append(Paragraph("1. Mandatory Label Declarations Extracted (OCR Audit)", section_heading))
        
        fields_data = [
            [Paragraph("<b>Declaration Category</b>", normal_style), Paragraph("<b>Raw Text Extracted</b>", normal_style), Paragraph("<b>Status</b>", normal_style)]
        ]
        
        for f in product_data.get('extractedFields', []):
            is_miss = f.get('isMissing')
            st_text = "<font color='red'>MISSING</font>" if is_miss else "<font color='green'>PRESENT</font>"
            fields_data.append([
                Paragraph(f"<b>{f.get('fieldName')}</b>", normal_style),
                Paragraph(str(f.get('rawValue')), normal_style),
                Paragraph(st_text, normal_style)
            ])

        fields_table = Table(fields_data, colWidths=[150, 310, 80])
        fields_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(fields_table)
        story.append(Spacer(1, 15))

        # Section 3: Statutory Compliance Evaluation
        story.append(Paragraph("2. Statutory Rule Compliance Checklist & Violations", section_heading))

        checks_data = [
            [Paragraph("<b>Rule Reference</b>", normal_style), Paragraph("<b>Rule Description</b>", normal_style), Paragraph("<b>Evaluation</b>", normal_style), Paragraph("<b>Statutory Section</b>", normal_style)]
        ]

        for check in product_data.get('ruleChecks', []):
            st = check.get('status')
            st_color = 'green' if st == 'PASS' else ('orange' if st == 'WARNING' else 'red')
            checks_data.append([
                Paragraph(f"<b>{check.get('ruleNumber')}</b>", normal_style),
                Paragraph(f"{check.get('title')}<br/><font color='#64748B'>{check.get('description')}</font>", normal_style),
                Paragraph(f"<font color='{st_color}'><b>{st}</b></font>", normal_style),
                Paragraph(f"<font size=7>{check.get('penaltySection')}</font>", normal_style)
            ])

        checks_table = Table(checks_data, colWidths=[90, 270, 70, 110])
        checks_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#E2E8F0')),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(checks_table)
        story.append(Spacer(1, 25))

        # Footer Signature Section
        sig_data = [
            [Paragraph("<b>Inspecting Officer Signature:</b> ___________________________", normal_style), Paragraph("<b>Official Stamp:</b>", normal_style)]
        ]
        sig_table = Table(sig_data, colWidths=[340, 200])
        sig_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        story.append(sig_table)

        doc.build(story)
        return output_path
