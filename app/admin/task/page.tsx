import { redirect } from 'next/navigation'
import { isTasksAbilitato } from '@/lib/impostazioni'
import { TaskBoard } from '@/components/task/TaskBoard'

export default async function TaskPage() {
  if (!await isTasksAbilitato()) redirect('/home')
  return <TaskBoard canManage={true} />
}
