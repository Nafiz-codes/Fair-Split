export interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  stripeAccountId: string | null;
}

export interface Expense {
  id: string;
  groupId: string;
  paidByMemberId: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  stripeTransferId: string | null;
  status: string;
  createdAt: string;
}

export interface GroupWithMembers {
  group: Group;
  members: Member[];
}
