import { DEFAULT_CORPORATE_CARDS, DEFAULT_DEPARTMENTS, DEFAULT_USERS } from '../data/constants';
import { SEED_EXECUTIONS_2026, SEED_PROGRAMS_2026 } from '../data/seedExecutions';
import { SEED_KPIS_2026 } from '../data/seedKpis';
import { SEED_TASKS_2026 } from '../data/seedTasks';
import { recalculateKpiTree } from './kpiEngine';
import {
  ApprovalRequest,
  CorporateCard,
  Department,
  Execution,
  KpiIndicator,
  Program,
  Task,
  User,
  YearData,
} from '../types';

const STORAGE_KEYS = {
  YEAR_LIST: 'univ_admin_years_list_v1',
  YEAR_DATA_PREFIX: 'univ_admin_year_',
  DEPARTMENTS: 'univ_admin_departments_v1',
  CORPORATE_CARDS: 'univ_admin_corporate_cards_v1',
  CURRENT_USER_ID: 'univ_admin_current_user_id_v1',
  USERS: 'univ_admin_users_v1',
};

export function getStoredYearList(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.YEAR_LIST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => a - b);
      }
    }
  } catch (e) {
    console.error('Failed to load years list', e);
  }
  const defaultList = [2025, 2026];
  localStorage.setItem(STORAGE_KEYS.YEAR_LIST, JSON.stringify(defaultList));
  return defaultList;
}

export function saveStoredYearList(years: number[]) {
  localStorage.setItem(STORAGE_KEYS.YEAR_LIST, JSON.stringify(years));
}

export function loadYearData(year: number): YearData {
  const key = `${STORAGE_KEYS.YEAR_DATA_PREFIX}${year}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      return data;
    }
  } catch (e) {
    console.error(`Failed to load year data for ${year}`, e);
  }

  // 2026년 기본 시드 데이터 생성
  if (year === 2026) {
    const seed2026: YearData = {
      meta: {
        year: 2026,
        copied_from_year: null,
        created_at: new Date().toISOString(),
        title: '2026학년도 대학혁신지원사업',
      },
      tasks: JSON.parse(JSON.stringify(SEED_TASKS_2026)),
      executions: JSON.parse(JSON.stringify(SEED_EXECUTIONS_2026)),
      programs: JSON.parse(JSON.stringify(SEED_PROGRAMS_2026)),
      kpis: recalculateKpiTree(JSON.parse(JSON.stringify(SEED_KPIS_2026))),
      approval_requests: {},
    };
    saveYearData(year, seed2026);
    return seed2026;
  }

  // 2025년 또는 기타 연도 기본 템플릿
  const baseTasks = JSON.parse(JSON.stringify(SEED_TASKS_2026));
  const fallbackYearData: YearData = {
    meta: {
      year,
      copied_from_year: null,
      created_at: new Date().toISOString(),
      title: `${year}학년도 대학혁신지원사업`,
    },
    tasks: baseTasks,
    executions: {},
    programs: {},
    kpis: recalculateKpiTree(JSON.parse(JSON.stringify(SEED_KPIS_2026))),
    approval_requests: {},
  };
  saveYearData(year, fallbackYearData);
  return fallbackYearData;
}

export function saveYearData(year: number, data: YearData) {
  try {
    const key = `${STORAGE_KEYS.YEAR_DATA_PREFIX}${year}`;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save year data for ${year}`, e);
  }
}

/**
 * 2절: "신규 연도 추가" - 원본 연도 복사 및 초기화 규칙 적용
 */
export function cloneYearData(sourceYear: number, newYear: number): YearData {
  const sourceData = loadYearData(sourceYear);

  // 1. 세부과제 & 주요추진항목 복사 (상태는 '예정'으로 초기화)
  const clonedTasks: { [code: string]: Task } = {};
  Object.entries(sourceData.tasks).forEach(([code, task]) => {
    const clonedItems: { [itemCode: string]: any } = {};
    Object.entries(task.items || {}).forEach(([itemCode, item]) => {
      clonedItems[itemCode] = {
        ...item,
        status: '예정',
        status_history: [{ status: '예정', changed_at: new Date().toISOString(), changed_by: '시스템' }],
      };
    });

    clonedTasks[code] = {
      ...task,
      items: clonedItems,
    };
  });

  // 2. 세부프로그램 뼈대 복사 (집행액 0, 실적 초기화, 상태 '예정')
  const clonedPrograms: { [id: string]: Program } = {};
  Object.entries(sourceData.programs).forEach(([id, prog]) => {
    const newProgId = `prog-${newYear}-${Math.random().toString(36).substring(2, 8)}`;
    clonedPrograms[newProgId] = {
      ...prog,
      id: newProgId,
      execution_amount_allocated: 0,
      result_report_doc_number: '',
      status: '예정',
      performance: {
        participants: 0,
        satisfaction_score: 0,
        etc_note: '',
      },
      updated_at: new Date().toISOString(),
    };
  });

  // 3. KPI 복사 (실적값, 증빙, 점검결과 초기화)
  const clonedKpis: KpiIndicator[] = sourceData.kpis.map((ind, iIdx) => ({
    ...ind,
    id: `kpi-${newYear}-${iIdx + 1}`,
    actual: 0,
    achievement: 0,
    details: ind.details.map((det, dIdx) => ({
      ...det,
      id: `det-${newYear}-${iIdx + 1}-${dIdx + 1}`,
      actual: 0,
      measures: det.measures.map((mea, mIdx) => ({
        ...mea,
        id: `mea-${newYear}-${iIdx + 1}-${dIdx + 1}-${mIdx + 1}`,
        actual: 0,
        sub_measures: mea.sub_measures.map((sm, sIdx) => ({
          ...sm,
          id: `sm-${newYear}-${iIdx + 1}-${dIdx + 1}-${mIdx + 1}-${sIdx + 1}`,
          actual: 0,
          check_result: '-',
          evidence_no: `${iIdx + 1}.${dIdx + 1}.${sIdx + 1}`,
          evidence_desc: '',
        })),
      })),
    })),
  }));

  const newYearData: YearData = {
    meta: {
      year: newYear,
      copied_from_year: sourceYear,
      created_at: new Date().toISOString(),
      title: `${newYear}학년도 대학혁신지원사업`,
    },
    tasks: clonedTasks,
    executions: {}, // 집행내역 전체 초기화
    programs: clonedPrograms,
    kpis: recalculateKpiTree(clonedKpis),
    approval_requests: {}, // 승인요청 초기화
  };

  saveYearData(newYear, newYearData);

  const existingYears = getStoredYearList();
  if (!existingYears.includes(newYear)) {
    const updated = [...existingYears, newYear].sort((a, b) => a - b);
    saveStoredYearList(updated);
  }

  return newYearData;
}

export function loadDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load departments', e);
  }
  localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(DEFAULT_DEPARTMENTS));
  return DEFAULT_DEPARTMENTS;
}

export function saveDepartments(depts: Department[]) {
  localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(depts));
}

export function loadCorporateCards(): CorporateCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CORPORATE_CARDS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load corporate cards', e);
  }
  localStorage.setItem(STORAGE_KEYS.CORPORATE_CARDS, JSON.stringify(DEFAULT_CORPORATE_CARDS));
  return DEFAULT_CORPORATE_CARDS;
}

export function saveCorporateCards(cards: CorporateCard[]) {
  localStorage.setItem(STORAGE_KEYS.CORPORATE_CARDS, JSON.stringify(cards));
}

export function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load users', e);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export function saveUsers(users: User[]) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}
