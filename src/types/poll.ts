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
     created_by: string;                           // auth.users.id
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
export const buildPollValidationSchema = (t: (key: string) => string) => {
     const percent = () => Yup.number().min(0, t('polls.validation.min0') || 'Must be >= 0').max(100, t('polls.validation.max100') || 'Must be <= 100');
     return Yup.object({
          client_id: Yup.string().trim().required(t('polls.validation.clientRequired') || 'Client required'),
          building_id: Yup.string().trim().required(t('polls.validation.buildingRequired') || 'Building required'),
          type: Yup.mixed<PollType>().oneOf(['yes_no', 'single_choice', 'multiple_choice', 'ranked_choice', 'score'] as const).required(),
          title: Yup.string().trim().min(3, t('polls.validation.titleTooShort') || 'Title too short').required(t('polls.validation.titleRequired') || 'Title required'),
          description: Yup.string().max(5000).nullable().default(''),

          allow_change_until_deadline: Yup.boolean().required(),
          allow_abstain: Yup.boolean().required(),
          allow_comments: Yup.boolean().required(),
          allow_anonymous: Yup.boolean().required(),

          options: Yup.array().of(
               Yup.object({
                    label: Yup.string().trim().required(t('polls.validation.optionLabelRequired') || 'Option label required'),
                    sort_order: Yup.number().min(1).required(),
               })
          ).when('type', (type, schema) => {
               const pollType = Array.isArray(type) ? type[0] : type;
               if (pollType === 'yes_no') return schema.min(0); // auto generated if empty
               if (pollType === 'single_choice' || pollType === 'multiple_choice' || pollType === 'ranked_choice' || pollType === 'score') {
                    return schema.min(2, t('polls.validation.atLeastTwoOptions') || 'At least two options');
               }
               return schema;
          }),

          max_choices: Yup.number().nullable().when('type', (type, s) => {
               const pollType = Array.isArray(type) ? type[0] : type;
               return pollType === 'multiple_choice'
                    ? s.min(1, t('polls.validation.maxChoicesMin') || 'Must be >= 1').required(t('polls.validation.maxChoicesReq') || 'Max choices required')
                    : s.nullable();
          }),

          rule: Yup.mixed().nullable(),
          supermajority_percent: percent().nullable().when('rule', (rule, s) => {
               const ruleValue = Array.isArray(rule) ? rule[0] : rule;
               return ruleValue === 'supermajority'
                    ? s.required(t('polls.validation.supermajorityRequired') || 'Required')
                    : s.nullable();
          }),
          threshold_percent: percent().nullable().when('rule', (rule, s) => {
               const ruleValue = Array.isArray(rule) ? rule[0] : rule;
               return ruleValue === 'threshold'
                    ? s.required(t('polls.validation.thresholdRequired') || 'Required')
                    : s.nullable();
          }),
          winners_count: Yup.number().nullable().when('rule', (rule, s) => {
               const ruleValue = Array.isArray(rule) ? rule[0] : rule;
               return ruleValue === 'top_k'
                    ? s.min(1, t('polls.validation.winnersMin') || 'Must be >= 1').required(t('polls.validation.winnersRequired') || 'Required')
                    : s.nullable();
          }),
          score_aggregation: Yup.mixed().nullable().when('type', (type, s) => {
               const pollType = Array.isArray(type) ? type[0] : type;
               return pollType === 'score'
                    ? s.required(t('polls.validation.scoreAggRequired') || 'Required')
                    : s.nullable();
          }),

          starts_at: Yup.string().nullable(),
          ends_at: Yup.string().nullable()
               .test('ends-after-starts', t('polls.validation.endsAfterStarts') || 'Ends must be after starts', function (value) {
                    const starts = this.parent.starts_at as string | null | undefined;
                    if (!starts || !value) return true;
                    try {
                         const s = new Date(starts).getTime();
                         const e = new Date(value).getTime();
                         return !Number.isNaN(s) && !Number.isNaN(e) && e > s;
                    } catch { return true; }
               }),

          activate_now: Yup.boolean().default(false),
     });
};
import * as Yup from 'yup';
