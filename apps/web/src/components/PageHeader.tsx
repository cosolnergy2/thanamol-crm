import React from 'react'

type PageHeaderProps = {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-2xl font-extralight tracking-[0.3em] text-slate-600 uppercase">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        <div className="h-px w-20 bg-gradient-to-r from-slate-300 to-transparent mt-2" />
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}
