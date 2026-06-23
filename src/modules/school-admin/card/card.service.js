// src/modules/school-admin/card/card.service.js
import { CardRepository } from './card.repository.js';
import { ApiError } from '../../../shared/response/ApiError.js';
import { IdGenerator } from '../../../services/IdGenerator.service.js';

export const CardService = {
  async createCard(schoolId, data) {
    const { studentId, tokenId, design, expiryDate } = data;

    // Check if student belongs to this school
    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new ApiError(404, 'Student not found in your school');

    // Check if card already exists for this student
    const existing = await CardRepository.findByStudentId(studentId, schoolId);
    if (existing) throw new ApiError(409, 'A card already exists for this student');

    // Optional: validate token belongs to the same school
    if (tokenId) {
      const token = await prisma.token.findFirst({
        where: { id: tokenId, student: { schoolId } },
      });
      if (!token) throw new ApiError(404, 'Token not found or does not belong to your school');
    }

    const cardNumber = await IdGenerator.generate('CARD'); // e.g., CRD-XXXXXX
    const issueDate = new Date();
    const finalExpiryDate = expiryDate || new Date(Date.now() + 365 * 86400000); // 1 year

    const newCard = await CardRepository.create({
      cardNumber,
      studentId,
      tokenId: tokenId || null,
      design: design || null,
      status: 'ACTIVE',
      issueDate,
      expiryDate: finalExpiryDate,
    });

    return newCard;
  },

  async getCardById(schoolId, cardId) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');
    return card;
  },

  async listCards(schoolId, query) {
    const { page, limit, status, studentId, search } = query;
    return CardRepository.findMany({
      schoolId,
      page,
      limit,
      status,
      studentId,
      search,
    });
  },

  async updateCard(schoolId, cardId, updateData) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');

    const updated = await CardRepository.update(cardId, updateData);
    return updated;
  },

  async renewCard(schoolId, cardId, { newExpiryDate }) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');
    if (card.status !== 'ACTIVE') {
      throw new ApiError(400, `Cannot renew a card with status ${card.status}`);
    }

    const updated = await CardRepository.update(cardId, {
      expiryDate: newExpiryDate,
    });
    return updated;
  },

  async blockCard(schoolId, cardId, { reason }) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');

    const updated = await CardRepository.update(cardId, {
      status: 'BLOCKED',
      blockReason: reason || null,
      blockedAt: new Date(),
    });
    return updated;
  },

  async unblockCard(schoolId, cardId) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');
    if (card.status !== 'BLOCKED') {
      throw new ApiError(400, 'Only blocked cards can be unblocked');
    }

    const updated = await CardRepository.update(cardId, {
      status: 'ACTIVE',
      blockReason: null,
      blockedAt: null,
    });
    return updated;
  },

  async deleteCard(schoolId, cardId) {
    const card = await CardRepository.findById(cardId, schoolId);
    if (!card) throw new ApiError(404, 'Card not found');
    await CardRepository.delete(cardId);
    return { success: true };
  },
};