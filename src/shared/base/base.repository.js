export class BaseRepository {
  constructor(prismaModel) {
    this.model = prismaModel; // e.g. prisma.student, prisma.school
  }

  async create(data) {
    return this.model.create({ data });
  }

  async findById(id, include = {}) {
    return this.model.findUnique({ where: { id }, include });
  }

  async findMany({ where = {}, skip = 0, take = 20, orderBy = {}, include = {} } = {}) {
    return this.model.findMany({ where, skip, take, orderBy, include });
  }

  async update(id, data) {
    return this.model.update({ where: { id }, data });
  }

  async delete(id) {
    return this.model.delete({ where: { id } });
  }

  async count(where = {}) {
    return this.model.count({ where });
  }
}
