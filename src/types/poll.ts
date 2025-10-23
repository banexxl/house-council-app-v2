/** =========================
 *  ENUMS (string literal types)
 *  ========================= */
export type PollType =
     | 'yes_no'
     | 'single_choice'
     | 'multiple_choice'
     | 'ranked_choice'
     | 'score';

export type PollStatus =
     | 'draft'
     | 'scheduled'
     | 'active'
     | 'closed'
     | 'archived';

export type VoteStatus = 'cast' | 'revoked';

export type DecisionRule =
     | 'plurality'
     | 'absolute_majority'
     | 'supermajority'
     | 'threshold'
     | 'top_k';

export type ScoreAgg = 'sum' | 'avg';

/** =========================
 *  I18N METADATA FOR ENUM-LIKE TYPES
 *  Each value maps to a translation key and a sensible fallback label.
 *  Use helpers like `pollTypeLabel(t, value)` to render.
 *  ========================= */

export type I18nFn = (key: string) => string;

export const POLL_TYPE_VALUES: PollType[] = ['yes_no', 'single_choice', 'multiple_choice', 'ranked_choice', 'score'];
export const POLL_TYPE_TRANSLATIONS: { value: PollType; key: string; defaultLabel: string }[] = [
     { value: 'yes_no', key: 'polls.types.yes_no', defaultLabel: 'Yes / No' },
     { value: 'single_choice', key: 'polls.types.single_choice', defaultLabel: 'Single Choice' },
     { value: 'multiple_choice', key: 'polls.types.multiple_choice', defaultLabel: 'Multiple Choice' },
     { value: 'ranked_choice', key: 'polls.types.ranked_choice', defaultLabel: 'Ranked Choice' },
     { value: 'score', key: 'polls.types.score', defaultLabel: 'Score' },
];

export const POLL_STATUS_VALUES: PollStatus[] = ['draft', 'scheduled', 'active', 'closed', 'archived'];
export const POLL_STATUS_TRANSLATIONS: { value: PollStatus; key: string; defaultLabel: string }[] = [
     { value: 'draft', key: 'polls.status.draft', defaultLabel: 'Draft' },
     { value: 'scheduled', key: 'polls.status.scheduled', defaultLabel: 'Scheduled' },
     { value: 'active', key: 'polls.status.active', defaultLabel: 'Active' },
     { value: 'closed', key: 'polls.status.closed', defaultLabel: 'Closed' },
     { value: 'archived', key: 'polls.status.archived', defaultLabel: 'Archived' },
];

export const VOTE_STATUS_VALUES: VoteStatus[] = ['cast', 'revoked'];
export const VOTE_STATUS_TRANSLATIONS: { value: VoteStatus; key: string; defaultLabel: string }[] = [
     { value: 'cast', key: 'polls.voteStatus.cast', defaultLabel: 'Cast' },
     { value: 'revoked', key: 'polls.voteStatus.revoked', defaultLabel: 'Revoked' },
];

export const DECISION_RULE_VALUES: DecisionRule[] = ['plurality', 'absolute_majority', 'supermajority', 'threshold', 'top_k'];
export const DECISION_RULE_TRANSLATIONS: { value: DecisionRule; key: string; defaultLabel: string }[] = [
     { value: 'plurality', key: 'polls.rules.plurality', defaultLabel: 'Plurality' },
     { value: 'absolute_majority', key: 'polls.rules.absolute_majority', defaultLabel: 'Absolute Majority' },
     { value: 'supermajority', key: 'polls.rules.supermajority', defaultLabel: 'Supermajority' },
     { value: 'threshold', key: 'polls.rules.threshold', defaultLabel: 'Threshold' },
     { value: 'top_k', key: 'polls.rules.top_k', defaultLabel: 'Top K' },
];

export const SCORE_AGG_VALUES: ScoreAgg[] = ['sum', 'avg'];
export const SCORE_AGG_TRANSLATIONS: { value: ScoreAgg; key: string; defaultLabel: string }[] = [
     { value: 'sum', key: 'polls.scoreAgg.sum', defaultLabel: 'Sum' },
     { value: 'avg', key: 'polls.scoreAgg.avg', defaultLabel: 'Average' },
];

type Meta = { key: string; defaultLabel: string };

export const POLL_TYPE_META: Record<PollType, Meta> = {
     yes_no: { key: 'polls.types.yes_no', defaultLabel: 'Yes / No' },
     single_choice: { key: 'polls.types.single_choice', defaultLabel: 'Single Choice' },
     multiple_choice: { key: 'polls.types.multiple_choice', defaultLabel: 'Multiple Choice' },
     ranked_choice: { key: 'polls.types.ranked_choice', defaultLabel: 'Ranked Choice' },
     score: { key: 'polls.types.score', defaultLabel: 'Score' },
};

export const POLL_STATUS_META: Record<PollStatus, Meta> = {
     draft: { key: 'polls.status.draft', defaultLabel: 'Draft' },
     scheduled: { key: 'polls.status.scheduled', defaultLabel: 'Scheduled' },
     active: { key: 'polls.status.active', defaultLabel: 'Active' },
     closed: { key: 'polls.status.closed', defaultLabel: 'Closed' },
     archived: { key: 'polls.status.archived', defaultLabel: 'Archived' },
};

export const VOTE_STATUS_META: Record<VoteStatus, Meta> = {
     cast: { key: 'polls.voteStatus.cast', defaultLabel: 'Cast' },
     revoked: { key: 'polls.voteStatus.revoked', defaultLabel: 'Revoked' },
};

export const DECISION_RULE_META: Record<DecisionRule, Meta> = {
     plurality: { key: 'polls.rules.plurality', defaultLabel: 'Plurality' },
     absolute_majority: { key: 'polls.rules.absolute_majority', defaultLabel: 'Absolute Majority' },
     supermajority: { key: 'polls.rules.supermajority', defaultLabel: 'Supermajority' },
     threshold: { key: 'polls.rules.threshold', defaultLabel: 'Threshold' },
     top_k: { key: 'polls.rules.top_k', defaultLabel: 'Top K' },
};

export const SCORE_AGG_META: Record<ScoreAgg, Meta> = {
     sum: { key: 'polls.scoreAgg.sum', defaultLabel: 'Sum' },
     avg: { key: 'polls.scoreAgg.avg', defaultLabel: 'Average' },
};

const tr = (t: I18nFn, key: string, fallback: string) => t(key) || fallback;

export const pollTypeLabel = (t: I18nFn, v: PollType) => tr(t, POLL_TYPE_META[v].key, POLL_TYPE_META[v].defaultLabel);
export const pollStatusLabel = (t: I18nFn, v: PollStatus) => tr(t, POLL_STATUS_META[v].key, POLL_STATUS_META[v].defaultLabel);
export const voteStatusLabel = (t: I18nFn, v: VoteStatus) => tr(t, VOTE_STATUS_META[v].key, VOTE_STATUS_META[v].defaultLabel);
export const decisionRuleLabel = (t: I18nFn, v: DecisionRule) => tr(t, DECISION_RULE_META[v].key, DECISION_RULE_META[v].defaultLabel);
export const scoreAggLabel = (t: I18nFn, v: ScoreAgg) => tr(t, SCORE_AGG_META[v].key, SCORE_AGG_META[v].defaultLabel);

export const getPollTypeOptions = (t: I18nFn) => POLL_TYPE_VALUES.map(v => ({ value: v, label: pollTypeLabel(t, v) }));
export const getPollStatusOptions = (t: I18nFn) => POLL_STATUS_VALUES.map(v => ({ value: v, label: pollStatusLabel(t, v) }));
export const getVoteStatusOptions = (t: I18nFn) => VOTE_STATUS_VALUES.map(v => ({ value: v, label: voteStatusLabel(t, v) }));
export const getDecisionRuleOptions = (t: I18nFn) => DECISION_RULE_VALUES.map(v => ({ value: v, label: decisionRuleLabel(t, v) }));
export const getScoreAggOptions = (t: I18nFn) => SCORE_AGG_VALUES.map(v => ({ value: v, label: scoreAggLabel(t, v) }));

/** =========================
 *  TABLE ROW TYPES (as returned from DB)
 *  ========================= */
export interface Poll {
     id: string;
     client_id: string;
     building_id: string;

     type: PollType;
     title: string;
     description: string | null;

     max_choices: number | null;                   // multiple_choice
     allow_change_until_deadline: boolean;
     allow_abstain: boolean;
     allow_comments: boolean;
     allow_anonymous: boolean;

     rule: DecisionRule | null;                    // null for ranked_choice
     supermajority_percent: number | null;         // e.g., 66.67
     threshold_percent: number | null;             // e.g., 50
     winners_count: number | null;                 // top_k
     score_aggregation: ScoreAgg | null;           // score

     starts_at: string | null;                     // ISO (timestamptz)
     ends_at: string | null;                       // ISO

     status: PollStatus;
     created_at: string;                           // ISO
     closed_at: string | null;                     // ISO
}

export interface PollOption {
     id: string;
     poll_id: string;
     label: string;
     sort_order: number;
}

export interface PollAttachment {
     id: string;
     poll_id: string;
     file_url: string;
     title: string | null;
     uploaded_by: string | null;                   // auth.users.id
     uploaded_at: string;                          // ISO
}

/** =========================
 *  VOTE PAYLOAD SHAPES
 *  ========================= */
export interface VoteYesNo {
     choice_bool: boolean;
     choice_option_ids?: never;
     ranks?: never;
     scores?: never;
}

export interface VoteSingleOrMultiple {
     choice_bool?: never;
     /** single_choice => length === 1; multiple_choice => 1..max_choices */
     choice_option_ids: string[];
     ranks?: never;
     scores?: never;
}

export interface VoteRanked {
     choice_bool?: never;
     choice_option_ids?: never;
     ranks: { option_id: string; rank: number }[]; // rank: 1 = highest preference, unique per option
     scores?: never;
}

export interface VoteScore {
     choice_bool?: never;
     choice_option_ids?: never;
     ranks?: never;
     /** scores constrained 0..5 on write */
     scores: { option_id: string; score: number }[];
}

/** Discriminated union helper by PollType */
export type VotePayloadByType<T extends PollType> =
     T extends 'yes_no' ? VoteYesNo
     : T extends 'single_choice' | 'multiple_choice' ? VoteSingleOrMultiple
     : T extends 'ranked_choice' ? VoteRanked
     : T extends 'score' ? VoteScore
     : never;

/** Raw vote row as stored in DB (union not enforced by DB; app should validate) */
export interface PollVote {
     id: string;
     poll_id: string;
     tenant_id: string;
     apartment_id: string | null;

     status: VoteStatus;            // 'cast' | 'revoked'
     cast_at: string;               // ISO
     abstain: boolean;
     is_anonymous: boolean;
     comment: string | null;

     // Payload columns (exactly one “shape” should be used)
     choice_bool: boolean | null;
     choice_option_ids: string[] | null;
     ranks: { option_id: string; rank: number }[] | null;
     scores: { option_id: string; score: number }[] | null;
}

/** =========================
 *  INSERT / UPDATE SHAPES
 *  (useful with Supabase .insert() / .update())
 *  ========================= */

/** tblPolls */
export type PollInsert = Omit<
     Poll,
     'id' | 'status' | 'created_at' | 'closed_at'
> & {
     id?: string;
     status?: PollStatus;     // default 'draft' in DB
     created_at?: string;
     closed_at?: string | null;
};

export type PollUpdate = Partial<Omit<Poll, 'id'>> & { id?: string };

/** tblPollOptions */
export type PollOptionInsert = Omit<PollOption, 'id'> & { id?: string };
export type PollOptionUpdate = Partial<Omit<PollOption, 'id'>> & { id?: string };

/** tblPollAttachments */
export type PollAttachmentInsert = Omit<PollAttachment, 'id' | 'uploaded_at'> & {
     id?: string;
     uploaded_at?: string;
};
export type PollAttachmentUpdate = Partial<Omit<PollAttachment, 'id'>> & { id?: string };

/** tblPollVotes */
export type PollVoteInsert = Omit<PollVote, 'id' | 'cast_at' | 'status'> & {
     id?: string;
     cast_at?: string;
     status?: VoteStatus;   // default 'cast' in DB
};

export type PollVoteUpdate = Partial<Omit<PollVote, 'id' | 'poll_id' | 'tenant_id'>> & {
     id?: string;
};

/** =========================
 *  NARROWED “FORM” TYPES (optional but handy)
 *  ========================= */

/** Create form shape you’ll likely use on the client */
export interface NewPollForm {
     client_id: string;
     building_id: string;

     type: PollType;
     title: string;
     description?: string;

     allow_change_until_deadline: boolean;
     allow_abstain: boolean;
     allow_comments: boolean;
     allow_anonymous: boolean;

     options: { label: string; sort_order: number }[]; // auto “Yes/No” for yes_no type

     // type-specific config
     max_choices?: number;                 // multiple_choice
     rule?: DecisionRule | null;           // null for ranked_choice
     supermajority_percent?: number | null;
     threshold_percent?: number | null;
     winners_count?: number | null;        // top_k
     score_aggregation?: ScoreAgg | null;  // score

     starts_at?: string | null;
     ends_at?: string | null;

     activate_now?: boolean;               // convenience flag for UI
}

/** A strongly-typed vote submit payload based on poll type */
export type VoteSubmitPayload<T extends PollType> =
     {
          poll_id: string;
          tenant_id: string;          // resolved on server if you prefer
          apartment_id?: string;
          abstain?: boolean;
          is_anonymous?: boolean;
          comment?: string;
     } & VotePayloadByType<T>;

/** =========================
 *  TYPE GUARDS (optional)
 *  ========================= */
export const isVoteYesNo = (v: unknown): v is VoteYesNo =>
     !!v && typeof (v as any).choice_bool === 'boolean';

export const isVoteSingleOrMultiple = (v: unknown): v is VoteSingleOrMultiple =>
     !!v && Array.isArray((v as any).choice_option_ids);

export const isVoteRanked = (v: unknown): v is VoteRanked =>
     !!v && Array.isArray((v as any).ranks);

export const isVoteScore = (v: unknown): v is VoteScore =>
     !!v && Array.isArray((v as any).scores);

/** =========================
 *  VALIDATION SCHEMA (Yup)
 *  ========================= */
export const buildPollValidationSchema = (t: (k: string) => string) => {
     const msg = (k: string, fallback: string) => t(k) || fallback;
     const numberPct = () =>
          Yup.number()
               .typeError(msg('polls.validation.number', 'Must be a number'))
               .min(0, msg('polls.validation.min0', 'Must be ≥ 0'))
               .max(100, msg('polls.validation.max100', 'Must be ≤ 100'));

     const dateStr = () =>
          Yup.string()
               .nullable()
               .test('is-date', msg('polls.validation.invalidDate', 'Invalid date'), v => {
                    if (!v) return true;
                    const ts = new Date(v).getTime();
                    return !Number.isNaN(ts);
               });

     return Yup.object({
          client_id: Yup.string().trim().required(msg('polls.validation.clientRequired', 'Client required')),
          building_id: Yup.string().trim().required(msg('polls.validation.buildingRequired', 'Building required')),
          type: Yup.mixed<PollType>()
               .oneOf(['yes_no', 'single_choice', 'multiple_choice', 'ranked_choice', 'score'] as const)
               .required(),
          title: Yup.string().trim().min(3, msg('polls.validation.titleTooShort', 'Title too short'))
               .required(msg('polls.validation.titleRequired', 'Title required')),
          description: Yup.string().max(500).default(''),

          allow_change_until_deadline: Yup.boolean().required(),
          allow_abstain: Yup.boolean().required(),
          allow_comments: Yup.boolean().required(),
          allow_anonymous: Yup.boolean().required(),

          options: Yup.array().of(
               Yup.object({
                    label: Yup.string().trim().required(msg('polls.validation.optionLabelRequired', 'Option label required')),
                    // pick ONE convention: 0-based or 1-based; here we use 0-based:
                    sort_order: Yup.number().integer().min(0).required(),
               })
          )
               .when('type', (type, schema: any) => {
                    const pollType = Array.isArray(type) ? type[0] : type;
                    if (pollType === 'yes_no') {
                         // yes/no can be auto-generated; allow 0 or 2; keep min(0)
                         return schema.min(0);
                    }
                    if (['single_choice', 'multiple_choice', 'ranked_choice', 'score'].includes(pollType)) {
                         return schema
                              .min(2, msg('polls.validation.atLeastTwoOptions', 'At least two options'))
                              .test('unique-labels', msg('polls.validation.uniqueOptions', 'Option labels must be unique'), (opts?: any[]) => {
                                   if (!opts) return true;
                                   const keys = opts.map(o => (o?.label || '').trim().toLowerCase());
                                   return new Set(keys).size === keys.length;
                              });
                    }
                    return schema;
               }),

          max_choices: Yup.number().nullable().when('type', (type, s: any) => {
               const pollType = Array.isArray(type) ? type[0] : type;
               return pollType === 'multiple_choice'
                    ? s
                         .typeError(msg('polls.validation.number', 'Must be a number'))
                         .integer(msg('polls.validation.integer', 'Must be an integer'))
                         .min(1, msg('polls.validation.maxChoicesMin', 'Must be ≥ 1'))
                         .required(msg('polls.validation.maxChoicesReq', 'Max choices required'))
                         .test('lte-options', msg('polls.validation.maxChoicesLteOptions', 'Must be ≤ number of options'), function (this: Yup.TestContext, value: any) {
                              const options = this.parent?.options ?? [];
                              if (typeof value !== 'number') return true;
                              return value <= options.length;
                         })
                    : s.nullable();
          }),

          // RULE constraints differ by type
          rule: Yup.mixed<DecisionRule>().nullable().when('type', (type, s: any) => {
               const pollType = Array.isArray(type) ? type[0] : type as PollType;
               if (pollType === 'ranked_choice') return s.nullable().test('must-be-null', msg('polls.validation.ruleNotAllowed', 'Rule not applicable for ranked choice'), (v: any) => v == null);
               if (pollType === 'score') return s.nullable().test('usually-null', msg('polls.validation.ruleUsuallyNull', 'Rule is not needed for score voting'), () => true);
               if (pollType === 'single_choice') return s.oneOf(['plurality', 'absolute_majority', 'supermajority', 'threshold'], msg('polls.validation.mustBeofPluralityAbsoluteMajoritySupermajorityThreshold', 'Rule is not needed for single choice voting')).required(msg('polls.validation.ruleReq', 'Rule required'));
               if (pollType === 'yes_no') return s.oneOf(['absolute_majority', 'supermajority', 'threshold'], msg('polls.validation.mustBeofAbsMajoritySuperMajorityThreshold', 'Rule is not needed for yes/no voting')).required(msg('polls.validation.ruleReq', 'Rule required'));
               if (pollType === 'multiple_choice') return s.oneOf(['top_k', 'threshold'], msg('polls.validation.mustBeofTopKThreshold', 'Rule is not needed for multiple choice voting')).required(msg('polls.validation.ruleReq', 'Rule required'));
               return s.nullable();
          }),

          supermajority_percent: numberPct()
               .nullable()
               .when('rule', (rule, s: any) => {
                    const v = Array.isArray(rule) ? rule[0] : rule;
                    // > 50 and ≤ 100
                    return v === 'supermajority'
                         ? s.moreThan(50, msg('polls.validation.supermajorityGt50', 'Must be > 50')).max(100).required(msg('polls.validation.supermajorityRequired', 'Required'))
                         : s.nullable();
               }),

          threshold_percent: numberPct()
               .nullable()
               .when('rule', (rule, s: any) => {
                    const v = Array.isArray(rule) ? rule[0] : rule;
                    // > 0 and ≤ 100
                    return v === 'threshold'
                         ? s.moreThan(0, msg('polls.validation.thresholdGt0', 'Must be > 0')).max(100).required(msg('polls.validation.thresholdRequired', 'Required'))
                         : s.nullable();
               }),

          winners_count: Yup.number().nullable().when('rule', (rule, s: any) => {
               const v = Array.isArray(rule) ? rule[0] : rule;
               return v === 'top_k'
                    ? s
                         .typeError(msg('polls.validation.number', 'Must be a number'))
                         .integer(msg('polls.validation.integer', 'Must be an integer'))
                         .min(1, msg('polls.validation.winnersMin', 'Must be ≥ 1'))
                         .required(msg('polls.validation.winnersRequired', 'Required'))
                         .test('lte-options', msg('polls.validation.winnersLteOptions', 'Must be ≤ number of options'), function (this: Yup.TestContext, value: any) {
                              const options = this.parent?.options as PollOption[] ?? [];
                              if (typeof value !== 'number') return true;
                              return value <= options.length;
                         })
                    : s.nullable();
          }),

          score_aggregation: Yup.mixed<ScoreAgg>()
               .nullable()
               .when('type', (type, s: any) => {
                    const pollType = Array.isArray(type) ? type[0] : type;
                    return pollType === 'score'
                         ? s.oneOf(['avg', 'sum']).required(msg('polls.validation.scoreAggRequired', 'Required'))
                         : s.nullable();
               }),

          starts_at: dateStr()
               .required(msg('polls.validation.startsRequired', 'Start date required'))
               .test('starts-not-in-past', msg('polls.validation.startsNotInPast', 'Start date must not be in the past'), function (value) {
                    if (!value) return true;
                    const now = Date.now();
                    const start = new Date(value).getTime();
                    return !Number.isNaN(start) && start >= now;
               }),
          ends_at: dateStr()
               .test('ends-after-starts', msg('polls.validation.endsAfterStarts', 'Ends must be after starts'), function (value) {
                    const starts = this.parent.starts_at as string | null | undefined;
                    if (!starts || !value) return true;
                    const s = new Date(starts).getTime();
                    const e = new Date(value).getTime();
                    return !Number.isNaN(s) && !Number.isNaN(e) && e > s;
               }),

          activate_now: Yup.boolean().default(false)
               .test('activate-window', msg('polls.validation.activateWindow', 'Start must be now/past and end must be in the future'), function (activate) {
                    if (!activate) return true;
                    const now = Date.now();
                    const starts = this.parent.starts_at ? new Date(this.parent.starts_at).getTime() : null;
                    const ends = this.parent.ends_at ? new Date(this.parent.ends_at).getTime() : null;
                    // starts_at omitted → OK; else must be ≤ now
                    const startsOk = !starts || (!Number.isNaN(starts) && starts <= now);
                    // ends_at omitted → OK; else must be > now
                    const endsOk = !ends || (!Number.isNaN(ends) && ends > now);
                    return startsOk && endsOk;
               }),
     });
};
import * as Yup from 'yup';
