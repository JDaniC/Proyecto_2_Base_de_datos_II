import { DashboardRepository } from '../services/contracts';
import { DashboardData, InstitucionId, RolId } from '../services/types';
import { MOCK_DASHBOARD_BY_INSTITUTION } from './mockDashboardData';

export class MockDashboardRepository implements DashboardRepository {
  async obtenerDashboard(institucionId: InstitucionId, _rolId: RolId): Promise<DashboardData> {
    const data = MOCK_DASHBOARD_BY_INSTITUTION[institucionId] || MOCK_DASHBOARD_BY_INSTITUTION.HOSPITAL_GENERAL;
    return JSON.parse(JSON.stringify(data)) as DashboardData;
  }
}
