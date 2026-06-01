// src/modules/parents/parent.controller.js
import { ParentService } from './parent.service.js';
import { ApiResponse } from '#shared/response/ApiResponse.js';
import { asyncHandler } from '#shared/response/asyncHandler.js';
import { createParentSchema, updateParentSchema, listParentsQuerySchema, exportParentsQuerySchema } from './parent.validation.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const service = new ParentService();

export const createParent = asyncHandler(async (req, res) => {
  const validated = createParentSchema.parse(req.body);
  const parent = await service.createParent(validated, { id: req.user.id, req });
  res.status(201).json(ApiResponse.success('Parent created successfully', parent));
});

export const getParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parent = await service.getParent(id, req.schoolId);
  res.json(ApiResponse.success('Parent fetched', parent));
});

export const listParents = asyncHandler(async (req, res) => {
  const query = listParentsQuerySchema.parse(req.query);
  const result = await service.listParents(query, req.schoolId);
  res.json(ApiResponse.paginate(result.parents, result.total, query.page, query.limit));
});

export const updateParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validated = updateParentSchema.parse(req.body);
  const updated = await service.updateParent(id, validated, { id: req.user.id, req }, req.schoolId);
  res.json(ApiResponse.success('Parent updated', updated));
});

export const deleteParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await service.deleteParent(id, { id: req.user.id, req }, req.schoolId);
  res.json(ApiResponse.success('Parent deleted successfully'));
});

export const getParentStats = asyncHandler(async (req, res) => {
  const stats = await service.getStats(req.schoolId);
  res.json(ApiResponse.success('Stats fetched', stats));
});

export const exportParents = asyncHandler(async (req, res) => {
  const query = exportParentsQuerySchema.parse(req.query);
  const result = await service.exportParents(query, req.schoolId, req.user);

  if (result.queued) {
    return res.json(ApiResponse.success('Export queued, you will receive an email'));
  }

  // Handle binary formats
  const { rows, format } = result;
  switch (format) {
    case 'csv':
      const csv = new Parser({ fields: Object.keys(rows[0] || {}) }).parse(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=parents.csv');
      return res.send(csv);
    case 'json':
      res.setHeader('Content-Type', 'application/json');
      return res.json(rows);
    case 'xlsx':
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Parents');
      worksheet.columns = Object.keys(rows[0] || {}).map(key => ({ header: key, key }));
      worksheet.addRows(rows);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=parents.xlsx');
      await workbook.xlsx.write(res);
      return res.end();
    case 'pdf':
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=parents.pdf');
      doc.pipe(res);
      doc.fontSize(16).text('Parents Report', { align: 'center' });
      doc.moveDown();
      rows.forEach(row => {
        doc.fontSize(10).text(`${row.name} | ${row.email} | ${row.phone}`);
        doc.moveDown(0.5);
      });
      doc.end();
      return;
    default:
      throw new Error('Unsupported format');
  }
});