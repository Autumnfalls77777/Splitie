import type {
  Expense,
  ExpenseSplit,
  Member,
  PersonalExpense,
  Reminder,
  Settlement,
  Trip,
} from '@/types/models';

export type TripRow = {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  cover: Trip['cover'];
  start_date: string;
  end_date: string;
  budget_paise: number | null;
  /** Legacy cache only. trip_members is authoritative after Phase 2. */
  members?: Member[];
  currency?: string | null;
  join_code?: string | null;
  created_by?: string;
  created_at: string;
  archived: boolean;
};

export type TripMemberRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  display_name: string;
  email: string | null;
  color: string;
  is_you: boolean;
  claimed_at?: string | null;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  trip_id: string;
  title: string;
  amount_paise: number;
  category: Expense['category'];
  paid_by: string;
  date: string;
  split_type: Expense['splitType'];
  splits: ExpenseSplit[];
  note: string | null;
  created_at: string;
};

export type SettlementRow = {
  id: string;
  trip_id: string;
  from_member_id: string;
  to_member_id: string;
  amount_paise: number;
  date: string;
  note: string | null;
  created_at: string;
};

export type PersonalExpenseRow = {
  id: string;
  title: string;
  amount_paise: number;
  category: PersonalExpense['category'];
  date: string;
  note: string | null;
  recurrence: PersonalExpense['recurrence'];
  payment_method: PersonalExpense['paymentMethod'];
  created_at: string;
};

export type ReminderRow = {
  id: string;
  type: Reminder['type'];
  title: string;
  body: string;
  due_date: string;
  amount_paise: number | null;
  trip_id: string | null;
  from_member_id: string | null;
  to_member_id: string | null;
  read: boolean;
  completed: boolean;
  notification_id: string | null;
  created_at: string;
};

export type UserSettingsRow = {
  user_id?: string;
  theme_mode: 'system' | 'light' | 'dark';
  currency: string;
  haptics_enabled: boolean;
  notifications_enabled: boolean;
  reminder_lead_days: number;
  monthly_budget_paise: number;
  compact_numbers: boolean;
};

/**
 * Trips never write the legacy `members` jsonb or the server-owned join code.
 * Real memberships live in trip_members; name-only rows are synced separately.
 */
export function tripToRow(
  trip: Trip,
): Omit<TripRow, 'created_by' | 'members' | 'join_code'> {
  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    emoji: trip.emoji,
    cover: trip.cover,
    start_date: trip.startDate,
    end_date: trip.endDate,
    budget_paise: trip.budgetPaise ?? null,
    currency: trip.currency ?? 'INR',
    created_at: trip.createdAt,
    archived: trip.archived ?? false,
  };
}

export function memberToRow(
  member: Member,
  tripId: string,
): Omit<TripMemberRow, 'user_id' | 'claimed_at'> {
  return {
    id: member.id,
    trip_id: tripId,
    display_name: member.name,
    email: member.email ?? null,
    color: member.color,
    is_you: member.isYou ?? false,
    created_at: new Date().toISOString(),
  };
}

export function expenseToRow(expense: Expense): Omit<ExpenseRow, 'created_by'> {
  return {
    id: expense.id,
    trip_id: expense.tripId,
    title: expense.title,
    amount_paise: expense.amountPaise,
    category: expense.category,
    paid_by: expense.paidBy,
    date: expense.date,
    split_type: expense.splitType,
    splits: expense.splits,
    note: expense.note ?? null,
    created_at: expense.createdAt,
  };
}

export function settlementToRow(settlement: Settlement): Omit<SettlementRow, 'created_by'> {
  return {
    id: settlement.id,
    trip_id: settlement.tripId,
    from_member_id: settlement.fromMemberId,
    to_member_id: settlement.toMemberId,
    amount_paise: settlement.amountPaise,
    date: settlement.date,
    note: settlement.note ?? null,
    created_at: settlement.createdAt,
  };
}

export function personalExpenseToRow(
  expense: PersonalExpense,
): Omit<PersonalExpenseRow, 'user_id'> {
  return {
    id: expense.id,
    title: expense.title,
    amount_paise: expense.amountPaise,
    category: expense.category,
    date: expense.date,
    note: expense.note ?? null,
    recurrence: expense.recurrence,
    payment_method: expense.paymentMethod,
    created_at: expense.createdAt,
  };
}

export function reminderToRow(reminder: Reminder): Omit<ReminderRow, 'user_id'> {
  return {
    id: reminder.id,
    type: reminder.type,
    title: reminder.title,
    body: reminder.body,
    due_date: reminder.dueDate,
    amount_paise: reminder.amountPaise ?? null,
    trip_id: reminder.tripId ?? null,
    from_member_id: reminder.fromMemberId ?? null,
    to_member_id: reminder.toMemberId ?? null,
    read: reminder.read,
    completed: reminder.completed,
    notification_id: reminder.notificationId ?? null,
    created_at: reminder.createdAt,
  };
}

export function rowToMember(row: TripMemberRow, currentUserId?: string): Member {
  return {
    id: row.id,
    name: row.display_name,
    email: row.email ?? undefined,
    color: row.color,
    userId: row.user_id ?? undefined,
    // The cloud flag is legacy and can be stale. Only the linked auth user
    // decides whether this row is the current user.
    isYou: Boolean(currentUserId) && row.user_id === currentUserId,
  };
}

export function rowToTrip(row: TripRow, members: Member[], currentUserId?: string): Trip {
  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    emoji: row.emoji,
    cover: row.cover,
    startDate: row.start_date,
    endDate: row.end_date,
    budgetPaise: row.budget_paise === null ? undefined : Number(row.budget_paise),
    currency: row.currency ?? 'INR',
    joinCode: row.join_code ?? undefined,
    members,
    createdBy: row.created_by ?? currentUserId ?? '',
    createdAt: row.created_at,
    archived: row.archived,
  };
}

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    tripId: row.trip_id,
    title: row.title,
    amountPaise: Number(row.amount_paise),
    category: row.category,
    paidBy: row.paid_by,
    date: row.date,
    splitType: row.split_type,
    splits: Array.isArray(row.splits) ? row.splits : [],
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function rowToSettlement(row: SettlementRow): Settlement {
  return {
    id: row.id,
    tripId: row.trip_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amountPaise: Number(row.amount_paise),
    date: row.date,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

export function rowToPersonalExpense(row: PersonalExpenseRow): PersonalExpense {
  return {
    id: row.id,
    title: row.title,
    amountPaise: Number(row.amount_paise),
    category: row.category,
    date: row.date,
    note: row.note ?? undefined,
    recurrence: row.recurrence,
    paymentMethod: row.payment_method,
    createdAt: row.created_at,
  };
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    dueDate: row.due_date,
    amountPaise: row.amount_paise === null ? undefined : Number(row.amount_paise),
    tripId: row.trip_id ?? undefined,
    fromMemberId: row.from_member_id ?? undefined,
    toMemberId: row.to_member_id ?? undefined,
    read: row.read,
    completed: row.completed,
    notificationId: row.notification_id ?? undefined,
    createdAt: row.created_at,
  };
}
