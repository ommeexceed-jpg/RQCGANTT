import { Component, OnInit, HostBinding, ViewChild } from '@angular/core';
import { GanttViewType, GanttItem, GanttGroup, NgxGanttComponent } from 'ngx-gantt';
// import { randomGroupsAndItems } from '../helper';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { random, randomGroupsAndItems, randomItems } from '../helper';

@Component({
    selector: 'app-gantt-groups-example',
    templateUrl: './gantt-groups.component.html',
    standalone: false
})
export class AppGanttGroupsExampleComponent implements OnInit {
    views = [
        {
            name: 'Day',
            value: GanttViewType.day
        },
        {
            name: 'Week',
            value: GanttViewType.week
        },
        {
            name: 'Month',
            value: GanttViewType.month
        },
        {
            name: 'Quarter',
            value: GanttViewType.quarter
        },
        {
            name: 'Year',
            value: GanttViewType.year
        }
    ];

    viewType: GanttViewType = GanttViewType.quarter;

    items: GanttItem[] = [];

    groups: GanttGroup[] = [];

    expanded = true;

    @ViewChild('gantt') ganttComponent: NgxGanttComponent;

    @HostBinding('class.gantt-example-component') class = true;

    constructor() {}

    ngOnInit(): void {
        const { groups, items } = randomGroupsAndItems(10);
        this.groups = groups;
        this.items = items;
    }

    expandAllGroups() {
        if (this.expanded) {
            this.expanded = false;
            this.ganttComponent.collapseAll();
        } else {
            this.expanded = true;
            this.ganttComponent.expandAll();
        }
    }

    childrenResolve = (item: GanttItem) => {
        const children = randomItems(random(1, 5), item);
        return of(children).pipe(delay(1000));
    };
}
