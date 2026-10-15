/** Compliance state of a control requirement. An absent status means `compliant`. */
export type CalmControlStatusSchema = 'compliant' | 'non-compliant';

type CalmControlDetailBaseSchema = {
    'requirement-url': string
    status?: CalmControlStatusSchema
    adrs?: string[]
}

export type CalmControlDetailSchema =
    | (CalmControlDetailBaseSchema & {
    'config-url': string
})
    | (CalmControlDetailBaseSchema & {
    config: Record<string, unknown>
})
    | (CalmControlDetailBaseSchema & {
    status: 'non-compliant'
    adrs: string[]
})

export type CalmControlSchema = {
    description: string
    requirements: CalmControlDetailSchema[]
}

export type CalmControlsSchema = {
    [controlId: string]: CalmControlSchema
}
