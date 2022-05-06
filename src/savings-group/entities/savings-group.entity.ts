import { Entity, Column, ManyToOne, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { ParentEntity } from '../../utils/entities/parent.entity';
import { UserToSavingsGroup } from '../../utils/entities/user-to-savingsgroup.entity';
import { User } from '../../user/entities/user.entity';
import { GroupType } from '../interfaces/savings-group.interface';

@Entity()
export class SavingsGroup extends ParentEntity {

    @Column()
    groupName: string;

    @ManyToOne(() => User, (user) => user.groupAdmin, { eager: true })
    groupAdmin: User;

    @ManyToMany(() => User, (user) => user.groups, { eager: true })
    @JoinTable()
    groupMembers: User[];

    @OneToMany(() => UserToSavingsGroup, userToSavingsGroup => userToSavingsGroup.savingsGroup)
    public userToSavingsGroup!: UserToSavingsGroup[];

    @Column({ type: "enum", enum: GroupType, default: GroupType.PUBLIC })
    groupType: GroupType;
}
