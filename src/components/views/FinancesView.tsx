import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  X,
  Filter,
  DollarSign
} from 'lucide-react';
import type { Transaction, TransactionType, UserPreferences } from '../../types/index.ts';

interface FinancesViewProps {
  transactions: Transaction[];
  preferences: UserPreferences;
  onSaveTransaction: (tx: Omit<Transaction, 'id' | 'createdAt' | 'userId'> & { id?: string }) => Promise<Transaction>;
  onDeleteTransaction: (txId: string) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  transactions,
  preferences,
  onSaveTransaction,
  onDeleteTransaction,
  onShowToast
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Form State
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>(preferences.defaultCurrency || 'NGN');
  const [category, setCategory] = useState<string>('Living');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Currency symbol map
  const currencySymbol = useMemo(() => {
    switch (currency) {
      case 'NGN': return '₦';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'CAD': return '$';
      default: return currency;
    }
  }, [currency]);

  // Current Month Summary calculations based on actual transactions
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthlyMetrics = useMemo(() => {
    const thisMonthTxs = transactions.filter((t) => t.date.startsWith(currentMonthStr));
    const totalIncome = thisMonthTxs
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = thisMonthTxs
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    return { totalIncome, totalExpense, netBalance, count: thisMonthTxs.length };
  }, [transactions, currentMonthStr]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => (filterType === 'all' ? true : t.type === filterType))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType]);

  const openNewModal = () => {
    setEditingTx(null);
    setType('expense');
    setAmount('');
    setCategory('Living');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setType(tx.type);
    setAmount(String(tx.amount));
    setCurrency(tx.currency);
    setCategory(tx.category);
    setDate(tx.date);
    setDescription(tx.description);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSaveTransaction({
        id: editingTx ? editingTx.id : undefined,
        type,
        amount: numAmount,
        currency,
        category,
        date,
        description: description.trim()
      });
      setIsModalOpen(false);
      onShowToast(editingTx ? 'Transaction updated.' : 'Transaction recorded!', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (txId: string) => {
    if (confirm('Delete this transaction?')) {
      await onDeleteTransaction(txId);
      onShowToast('Transaction removed.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8293A5] text-xs font-semibold">
            <span>This Month&apos;s Income</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#202C39]">
            {currencySymbol}{monthlyMetrics.totalIncome.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#8293A5] mt-1">Recorded inflows</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8293A5] text-xs font-semibold">
            <span>This Month&apos;s Expenses</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-[#202C39]">
            {currencySymbol}{monthlyMetrics.totalExpense.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#8293A5] mt-1">Recorded outflows</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#DCE1E5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8293A5] text-xs font-semibold">
            <span>Net Monthly Balance</span>
            <Wallet className="w-4 h-4 text-[#D5A34B]" />
          </div>
          <div
            className={`mt-2 text-2xl font-black ${
              monthlyMetrics.netBalance >= 0 ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {currencySymbol}{monthlyMetrics.netBalance.toLocaleString()}
          </div>
          <span className="text-[10px] text-[#8293A5] mt-1">
            {monthlyMetrics.count} transactions in {currentMonthStr}
          </span>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-2">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors ${
                filterType === t
                  ? 'bg-[#202C39] text-[#F7F7F4]'
                  : 'text-[#8293A5] hover:text-[#202C39] hover:bg-[#F2F5F8]'
              }`}
            >
              {t} ({t === 'all' ? transactions.length : transactions.filter((x) => x.type === t).length})
            </button>
          ))}
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2 bg-[#202C39] hover:bg-[#151E28] text-[#F7F7F4] rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#D5A34B]" /> Record Entry
        </button>
      </div>

      {/* Transaction List */}
      <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl p-4 shadow-xs divide-y divide-[#DCE1E5]">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-[#8293A5]">
            <Wallet className="w-8 h-8 mx-auto mb-2 text-[#DCE1E5]" />
            <h4 className="font-semibold text-sm text-[#202C39]">No transactions recorded</h4>
            <p className="text-xs mt-1">Keep a clear record of income and essential living expenses.</p>
            <button
              onClick={openNewModal}
              className="mt-4 px-4 py-2 bg-[#202C39] text-[#F7F7F4] text-xs font-semibold rounded-lg hover:bg-[#151E28]"
            >
              Add an entry
            </button>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-[#F7F7F4]/60 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isIncome ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#202C39] block">{tx.description}</span>
                    <span className="text-[11px] text-[#8293A5]">
                      {tx.category} • {tx.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-black font-mono ${
                      isIncome ? 'text-green-700' : 'text-[#202C39]'
                    }`}
                  >
                    {isIncome ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString()}
                  </span>

                  <div className="flex items-center gap-1 text-[#8293A5]">
                    <button
                      onClick={() => openEditModal(tx)}
                      className="p-1 hover:text-[#202C39] rounded"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="p-1 hover:text-red-600 rounded"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202C39]/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#FFFFFF] border border-[#DCE1E5] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE1E5]">
              <h3 className="font-bold text-base text-[#202C39]">
                {editingTx ? 'Edit Transaction' : 'Record Transaction'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8293A5] hover:text-[#202C39] p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    type === 'expense'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-[#F7F7F4] text-[#8293A5] hover:bg-[#F2F5F8]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-xl text-xs font-bold transition-colors ${
                    type === 'income'
                      ? 'bg-green-700 text-white shadow-xs'
                      : 'bg-[#F7F7F4] text-[#8293A5] hover:bg-[#F2F5F8]'
                  }`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-[#8293A5]">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs font-bold text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Server hosting, Design client retainer, Groceries"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  >
                    <option value="Living">Living / Rent</option>
                    <option value="Software">Software & Tools</option>
                    <option value="Freelance">Freelance Client</option>
                    <option value="Salary">Salary / Stipend</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Education">Education & Books</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8293A5] mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F4] border border-[#DCE1E5] rounded-lg text-xs text-[#202C39] focus:ring-2 focus:ring-[#202C39]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#DCE1E5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8293A5] hover:text-[#202C39]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount}
                  className="px-5 py-2 bg-[#202C39] hover:bg-[#151E28] text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
