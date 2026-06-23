// src/modules/school-admin/card/card.controller.js
import { CardService } from './card.service.js';
import { asyncHandler } from '../../../shared/response/asyncHandler.js';
import { ApiResponse } from '../../../shared/response/ApiResponse.js';

export const CardController = {
  createCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId; // from auth middleware
    const card = await CardService.createCard(schoolId, req.body);
    return ApiResponse.created(res, card, 'Card created successfully');
  }),

  getCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    const card = await CardService.getCardById(schoolId, cardId);
    return ApiResponse.success(res, card);
  }),

  listCards: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const query = req.query;
    const result = await CardService.listCards(schoolId, query);
    return ApiResponse.paginated(res, result.cards, result.total, query.page, query.limit);
  }),

  updateCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    const updated = await CardService.updateCard(schoolId, cardId, req.body);
    return ApiResponse.success(res, updated, 'Card updated');
  }),

  renewCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    const updated = await CardService.renewCard(schoolId, cardId, req.body);
    return ApiResponse.success(res, updated, 'Card renewed');
  }),

  blockCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    const updated = await CardService.blockCard(schoolId, cardId, req.body);
    return ApiResponse.success(res, updated, 'Card blocked');
  }),

  unblockCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    const updated = await CardService.unblockCard(schoolId, cardId);
    return ApiResponse.success(res, updated, 'Card unblocked');
  }),

  deleteCard: asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { cardId } = req.params;
    await CardService.deleteCard(schoolId, cardId);
    return ApiResponse.success(res, null, 'Card deleted');
  }),
};