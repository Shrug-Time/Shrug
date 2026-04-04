import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileSection, Post } from '@/types/models';
import { ProfileSectionService } from '@/services/profileSectionService';
import { PostService } from '@/services/standardized';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

type SortOption = 'newest' | 'oldest' | 'popular';
type OrgMethod = 'chronological' | 'popularity' | 'series' | 'custom';

interface CustomSectionCreatorProps {
  userId: string;
  section?: ProfileSection;
  defaultOrganizationMethod?: OrgMethod;
  onSave: (section: ProfileSection) => void;
  onCancel: () => void;
}

// Stable color palette for totems — cycles through hues
const TOTEM_COLORS = [
  'bg-violet-100 text-violet-700 border border-violet-200',
  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'bg-amber-100 text-amber-700 border border-amber-200',
  'bg-rose-100 text-rose-700 border border-rose-200',
  'bg-sky-100 text-sky-700 border border-sky-200',
  'bg-orange-100 text-orange-700 border border-orange-200',
  'bg-teal-100 text-teal-700 border border-teal-200',
  'bg-pink-100 text-pink-700 border border-pink-200',
];

function getTotemColor(totemName: string, allTotems: string[]): string {
  const idx = allTotems.indexOf(totemName);
  return TOTEM_COLORS[idx % TOTEM_COLORS.length];
}

const ORG_OPTIONS: { value: OrgMethod; label: string; icon: string; description: string }[] = [
  {
    value: 'chronological',
    label: 'Chronological',
    icon: '🕒',
    description: 'Newest content first. Great for updates, news, or recent discoveries.',
  },
  {
    value: 'popularity',
    label: 'By Popularity',
    icon: '⭐',
    description: 'Most liked content first. Highlights your best and most engaging answers.',
  },
  {
    value: 'series',
    label: 'Curriculum / Series',
    icon: '📚',
    description: 'A structured path where each item is numbered — perfect for tutorials or step-by-step guides.',
  },
  {
    value: 'custom',
    label: 'Custom Order',
    icon: '🎯',
    description: 'Arrange items in any order you like using drag-and-drop or arrows.',
  },
];

export function CustomSectionCreator({
  userId,
  section,
  defaultOrganizationMethod = 'chronological',
  onSave,
  onCancel,
}: CustomSectionCreatorProps) {
  const router = useRouter();

  // --- form state ---
  const [title, setTitle] = useState(section?.title || '');
  const [titleError, setTitleError] = useState(false);
  const [organizationMethod, setOrganizationMethod] = useState<OrgMethod>(
    section?.organizationMethod || defaultOrganizationMethod
  );

  // --- data state ---
  const [answers, setAnswers] = useState<Post[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<Post[]>([]);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>(section?.contentIds || []);
  const [orderedSelectedAnswers, setOrderedSelectedAnswers] = useState<string[]>(
    section?.contentIds || []
  );
  const [totems, setTotems] = useState<string[]>([]);
  const [selectedTotem, setSelectedTotem] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // --- ui state ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'info' | 'content' | 'order'>('info');

  const needsOrderStep = organizationMethod === 'series' || organizationMethod === 'custom';
  const totalSteps = needsOrderStep ? 3 : 2;
  const stepNumber = step === 'info' ? 1 : step === 'content' ? 2 : 3;

  // Load answers — fetch posts the user has answered, then filter down to only
  // those where the user's answer object actually exists in the answers array.
  // This prevents questions-without-answers showing up due to data inconsistencies,
  // and handles the case where a user has multiple answers to the same question
  // by creating a separate selectable entry per answer.
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await PostService.getUserAnswers(userId, 100);
        const posts = result.posts || [];

        // Expand: one entry per answer the user has written, not one per post.
        // Eliminates posts where the user's answer is missing from the answers array,
        // and correctly surfaces multiple answers to the same question as separate items.
        const expanded: Post[] = [];
        const seenAnswerIds = new Set<string>();
        posts.forEach(post => {
          const myAnswers = post.answers?.filter(a => a.firebaseUid === userId) || [];
          myAnswers.forEach(answer => {
            if (!seenAnswerIds.has(answer.id)) {
              seenAnswerIds.add(answer.id);
              expanded.push({ ...post, answers: [answer] });
            }
          });
        });

        const deduped = expanded.sort((a, b) => b.createdAt - a.createdAt);

        setAnswers(deduped);
        setFilteredAnswers(deduped);

        // Collect totems only from the user's own answers
        const totemSet = new Set<string>();
        deduped.forEach(post => {
          post.answers[0]?.totems?.forEach(t => { if (t.name) totemSet.add(t.name); });
        });
        setTotems(Array.from(totemSet).sort());
      } catch (err) {
        console.error('Error loading answers:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  // Keep ordered list in sync with selection
  useEffect(() => {
    setOrderedSelectedAnswers(prev => {
      const kept = prev.filter(id => selectedAnswerIds.includes(id));
      const added = selectedAnswerIds.filter(id => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [selectedAnswerIds]);

  // Filter + sort — each item has exactly answers[0] as the user's own answer
  useEffect(() => {
    let filtered = [...answers];
    if (selectedTotem) {
      filtered = filtered.filter(post =>
        post.answers[0]?.totems?.some(t => t.name === selectedTotem)
      );
    }
    const sorted = [...filtered];
    if (sortOption === 'newest') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (sortOption === 'oldest') sorted.sort((a, b) => a.createdAt - b.createdAt);
    else sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    setFilteredAnswers(sorted);
  }, [selectedTotem, answers, sortOption, userId]);

  // --- handlers ---
  const handleNextStep = () => {
    if (step === 'info') {
      if (!title.trim()) { setTitleError(true); return; }
      setStep('content');
    } else if (step === 'content') {
      if (selectedAnswerIds.length === 0) return; // button is disabled
      if (needsOrderStep) { setStep('order'); } else { handleSave(); }
    } else {
      handleSave();
    }
  };

  const handleBack = () => {
    if (step === 'content') setStep('info');
    else if (step === 'order') setStep('content');
  };

  const handleSave = async () => {
    if (!title.trim()) { setTitleError(true); setStep('info'); return; }
    setIsSaving(true);
    try {
      const sectionData: Omit<ProfileSection, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        type: 'custom',
        organizationMethod,
        contentIds: needsOrderStep ? orderedSelectedAnswers : selectedAnswerIds,
        position: section?.position ?? 0,
        isVisible: section?.isVisible ?? true,
      };
      const saved = section?.id
        ? await ProfileSectionService.updateSection(userId, section.id, sectionData)
        : await ProfileSectionService.createSection(userId, sectionData);
      onSave(saved);
    } catch (err) {
      console.error('Error saving section:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAnswer = (id: string) => {
    setSelectedAnswerIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveItem = (id: string, dir: 'up' | 'down') => {
    setOrderedSelectedAnswers(prev => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = [...prev];
      if (dir === 'up' && idx > 0) [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
      else if (dir === 'down' && idx < next.length - 1) [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const handleDragStart = (id: string) => setDraggedItem(id);
  const handleDragEnd = () => setDraggedItem(null);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;
    setOrderedSelectedAnswers(prev => {
      const from = prev.indexOf(draggedItem);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, draggedItem);
      return next;
    });
  };

  // --- render ---
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {section ? 'Edit' : 'Create'} Section
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const n = i + 1;
          const label = n === 1 ? 'Name & Type' : n === 2 ? 'Pick Answers' : 'Set Order';
          const active = n === stepNumber;
          const done = n < stepNumber;
          return (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active ? 'bg-blue-600 text-white' :
                done ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done ? '✓ ' : `${n}. `}{label}
              </div>
              {i < totalSteps - 1 && <div className="w-4 h-px bg-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Name & Type ── */}
      {step === 'info' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
              placeholder="e.g. Fly Fishing Basics or My Top Picks"
              className={`w-full px-3 py-2 rounded-lg border shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                titleError
                  ? 'border-red-400 focus:ring-red-300 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-300'
              }`}
            />
            {titleError && (
              <p className="mt-1.5 text-xs text-red-600 font-medium">
                Give your section a name before continuing.
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">How should items be displayed?</p>
            <p className="text-xs text-gray-500 mb-3">You can change this later.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ORG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOrganizationMethod(opt.value)}
                  className={`text-left border-2 rounded-xl p-4 transition-all ${
                    organizationMethod === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                    {organizationMethod === opt.value && (
                      <span className="ml-auto text-blue-500 text-xs font-bold">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>

            {(organizationMethod === 'series' || organizationMethod === 'custom') && (
              <div className="mt-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {organizationMethod === 'series'
                  ? 'On the next step you\'ll pick your answers, then arrange them into a numbered sequence.'
                  : 'On the next step you\'ll pick your answers, then drag them into whatever order you like.'
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Pick Answers ── */}
      {step === 'content' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {selectedAnswerIds.length > 0
                ? <><span className="font-semibold text-blue-700">{selectedAnswerIds.length}</span> selected</>
                : 'Select at least one answer to continue'}
            </p>
            {filteredAnswers.length > 0 && (
              <button
                onClick={() => {
                  const ids = filteredAnswers.map(p => p.id);
                  setSelectedAnswerIds(prev => Array.from(new Set([...prev, ...ids])));
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all shown
              </button>
            )}
          </div>

          {/* Totem filters */}
          {totems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTotem(null)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedTotem === null
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                }`}
              >
                All
              </button>
              {totems.map(totem => {
                const color = getTotemColor(totem, totems);
                const active = selectedTotem === totem;
                return (
                  <button
                    key={totem}
                    onClick={() => setSelectedTotem(active ? null : totem)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      active
                        ? color + ' ring-2 ring-offset-1 ring-current'
                        : color + ' opacity-70 hover:opacity-100'
                    }`}
                  >
                    {totem}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sort */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Sort:</label>
            <select
              value={sortOption}
              onChange={e => setSortOption(e.target.value as SortOption)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="popular">Most popular</option>
            </select>
          </div>

          {/* Answer list or empty state */}
          {answers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="text-4xl">✍️</div>
              <div>
                <p className="font-medium text-gray-800 mb-1">No answers to add yet</p>
                <p className="text-sm text-gray-500">Sections are built from your answers to questions. Go answer some first, then come back.</p>
              </div>
              <button
                onClick={() => router.push('/')}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Answer some questions
              </button>
            </div>
          ) : filteredAnswers.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No answers match this totem filter.{' '}
              <button onClick={() => setSelectedTotem(null)} className="text-blue-600 hover:underline">
                Clear filter
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredAnswers.map(post => {
                // Use answer id as key — post.id is not unique when the user
                // has multiple answers to the same question.
                const itemKey = `${post.id}_${post.answers[0]?.id}`;
                const selected = selectedAnswerIds.includes(post.id);
                // answers[0] is guaranteed to be the user's own answer (set at load time)
                const myAnswer = post.answers[0];
                const myTotems = (myAnswer?.totems?.map(t => t.name).filter(Boolean) || []) as string[];

                return (
                  <div
                    key={itemKey}
                    onClick={() => toggleAnswer(post.id)}
                    className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                      selected
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                        selected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'
                      }`}>
                        {selected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{post.question}</p>
                        {myAnswer?.text && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {myAnswer.text}
                          </p>
                        )}
                        {myTotems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {myTotems.map(t => (
                              <span key={t} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTotemColor(t, totems)}`}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No answers selected nudge */}
          {answers.length > 0 && selectedAnswerIds.length === 0 && (
            <p className="text-xs text-center text-amber-600 font-medium">
              Select at least one answer to continue to the next step.
            </p>
          )}
        </div>
      )}

      {/* ── Step 3: Order ── */}
      {step === 'order' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-1">
              {organizationMethod === 'series' ? 'Set the learning sequence' : 'Arrange your order'}
            </p>
            <p className="text-xs text-gray-500">Drag items or use the arrows to reorder.</p>
          </div>

          {orderedSelectedAnswers.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No items selected.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {orderedSelectedAnswers.map((id, index) => {
                const post = answers.find(a => a.id === id);
                if (!post) return null;
                const isDragging = draggedItem === id;
                const orderKey = `${id}_${post.answers[0]?.id}`;
                return (
                  <div
                    key={orderKey}
                    draggable
                    onDragStart={() => handleDragStart(id)}
                    onDragOver={e => handleDragOver(e, id)}
                    onDragEnd={handleDragEnd}
                    className={`border-2 rounded-xl p-3 flex items-center gap-3 transition-all ${
                      isDragging
                        ? 'border-blue-400 bg-blue-50 opacity-60'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {/* Step number for series */}
                    {organizationMethod === 'series' && (
                      <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">
                        {index + 1}
                      </div>
                    )}
                    <div className="text-gray-400 cursor-grab active:cursor-grabbing select-none text-lg">⠿</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 line-clamp-1">{post.question}</p>
                      {post.answers[0]?.text && (
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5">{post.answers[0].text}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveItem(id, 'up')}
                        disabled={index === 0}
                        className={`p-1 rounded text-xs leading-none ${index === 0 ? 'text-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveItem(id, 'down')}
                        disabled={index === orderedSelectedAnswers.length - 1}
                        className={`p-1 rounded text-xs leading-none ${index === orderedSelectedAnswers.length - 1 ? 'text-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom navigation */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-4">
        <button
          onClick={step === 'info' ? onCancel : handleBack}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {step === 'info' ? 'Cancel' : '← Back'}
        </button>

        <button
          onClick={handleNextStep}
          disabled={
            isSaving ||
            (step === 'content' && answers.length > 0 && selectedAnswerIds.length === 0)
          }
          title={
            step === 'content' && selectedAnswerIds.length === 0
              ? 'Select at least one answer to continue'
              : undefined
          }
          className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
            step === 'content' && answers.length > 0 && selectedAnswerIds.length === 0
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSaving
            ? 'Saving...'
            : step === 'order' || (step === 'content' && !needsOrderStep)
            ? 'Save Section'
            : 'Next →'}
        </button>
      </div>
    </div>
  );
}
