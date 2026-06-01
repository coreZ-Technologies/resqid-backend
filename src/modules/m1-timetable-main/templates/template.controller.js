import * as templateService from './template.service';

export async function create(req, res, next) {
  try {
    const template = await templateService.createTemplate(req.schoolId, req.body);
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req, res, next) {
  try {
    const template = await templateService.getTemplate(req.params.id, req.schoolId);
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const templates = await templateService.listTemplates(req.schoolId);
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const template = await templateService.updateTemplate(req.params.id, req.schoolId, req.body);
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    await templateService.deleteTemplate(req.params.id, req.schoolId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
