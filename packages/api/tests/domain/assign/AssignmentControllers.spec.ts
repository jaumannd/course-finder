import {
  AssignmentStudentController,
  type StudentPhaseWithChoices,
} from '../../../src/domain/assign/AssignmentControllers'
import type { CourseAppointmentsJson } from '../../../src/prisma/PrismaTypes'

describe('AssignmentStudentController', () => {
  let controller: AssignmentStudentController
  let phase: StudentPhaseWithChoices
  let offeredCourses: {
    appointments: CourseAppointmentsJson<string>
    Course: { creditPoints: number }
    moduleCode: string
  }[]

  beforeEach(() => {
    phase = {
      creditsNeeded: 6,
      StudentChoice: [
        {
          moduleCode: '1',
          phaseId: 0,
          points: 1000,
          username: '',
        },
      ],
      username: 'user1',
    }
    offeredCourses = [
      {
        appointments: { dates: [], type: 'weekly' },
        Course: { creditPoints: 3 },
        moduleCode: '1',
      },
      {
        appointments: { dates: [], type: 'weekly' },
        Course: { creditPoints: 3 },
        moduleCode: '2',
      },
    ]
    controller = new AssignmentStudentController(phase, offeredCourses)
  })

  it('should initialize with correct values', () => {
    expect(controller.choices).toEqual(phase.StudentChoice)
    expect(controller.gained).toEqual([])
    expect(controller.lost).toEqual([])
  })

  it('should gain a course', () => {
    controller.gainCourse('1')
    expect(controller.gained).toEqual([
      expect.objectContaining({ moduleCode: '1', points: 1000 }),
    ])
    expect(controller.choices).toEqual([])
  })

  it('should lose a course', () => {
    controller.looseCourse('1')
    expect(controller.lost).toEqual([
      expect.objectContaining({ moduleCode: '1', points: 1000 }),
    ])
    expect(controller.choices.length).toBe(0)
  })

  it('should cancel a course', () => {
    controller.gainCourse('1')
    controller.courseCanceled('1')
    expect(controller.lost).toEqual([
      expect.objectContaining({ moduleCode: '1', points: 1000 }),
    ])
    expect(controller.choices.length).toBe(0)
    expect(controller.gained.length).toBe(0)
  })

  it('should check if finished', () => {
    phase.StudentChoice.push({
      moduleCode: '2',
      phaseId: 0,
      points: 1,
      username: '',
    })
    controller = new AssignmentStudentController(phase, offeredCourses)
    expect(controller.isFinished()).toBe(false)
    controller.gainCourse('1')
    expect(controller.isFinished()).toBe(false)
    controller.gainCourse('2')
    expect(controller.isFinished()).toBe(true)
  })

  it('should return username', () => {
    expect(controller.username).toBe('user1')
  })

  it('removes conflicting choices and redistributes their points', () => {
    offeredCourses[0].appointments = {
      dates: [{ from: '2026-01-05T10:00:00', to: '2026-01-05T12:00:00' }],
      type: 'weekly',
    }
    offeredCourses[1].appointments = {
      dates: [{ from: '2026-01-05T11:00:00', to: '2026-01-05T13:00:00' }],
      type: 'weekly',
    }
    offeredCourses.push(
      {
        appointments: { dates: [], type: 'weekly' },
        Course: { creditPoints: 3 },
        moduleCode: '3',
      },
      {
        appointments: { dates: [], type: 'weekly' },
        Course: { creditPoints: 3 },
        moduleCode: '4',
      },
    )
    phase.StudentChoice = [
      { moduleCode: '1', phaseId: 0, points: 800, username: 'user1' },
      { moduleCode: '2', phaseId: 0, points: 101, username: 'user1' },
      { moduleCode: '3', phaseId: 0, points: 50, username: 'user1' },
      { moduleCode: '4', phaseId: 0, points: 49, username: 'user1' },
    ]
    controller = new AssignmentStudentController(phase, offeredCourses)

    controller.gainCourse('1')

    expect(
      controller.choices.map(({ moduleCode, points }) => [moduleCode, points]),
    ).toEqual([
      ['3', 101],
      ['4', 99],
    ])
    expect(controller.lost.map(({ moduleCode }) => moduleCode)).toEqual(['2'])
    expect(
      controller.gained.map(({ moduleCode, points }) => [moduleCode, points]),
    ).toEqual([['1', 800]])
  })

  it('does not treat adjacent appointment times as conflicts', () => {
    offeredCourses[0].appointments = {
      dates: [{ from: '2026-01-05T10:00:00', to: '2026-01-05T12:00:00' }],
      type: 'weekly',
    }
    offeredCourses[1].appointments = {
      dates: [{ from: '2026-01-05T12:00:00', to: '2026-01-05T14:00:00' }],
      type: 'weekly',
    }
    phase.StudentChoice.push({
      moduleCode: '2',
      phaseId: 0,
      points: 1,
      username: 'user1',
    })
    controller = new AssignmentStudentController(phase, offeredCourses)
    controller.gainCourse('1')
    expect(controller.choices.map(({ moduleCode }) => moduleCode)).toEqual([
      '2',
    ])
  })
})
