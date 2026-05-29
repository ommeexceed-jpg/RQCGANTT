import { Component, OnInit } from '@angular/core';
import { DocItem } from '@docgeni/template';

@Component({
    selector: 'app-example-components',
    templateUrl: './components.component.html',
    standalone: false
})
export class AppExampleComponentsComponent implements OnInit {
    menus: DocItem[] = [
        {
            id: 'basic',
            title: 'Basic Usage',
            subtitle: 'Basic',
            path: 'basic'
        },
        {
            id: 'groups',
            title: 'Group Display',
            subtitle: 'Groups',
            path: 'groups'
        },
        {
            id: 'virtual-scroll',
            title: 'Virtual Scroll',
            subtitle: 'Virtual Scroll',
            path: 'virtual-scroll'
        },
        {
            id: 'custom-view',
            title: 'Custom View',
            subtitle: 'Custom View',
            path: 'custom-view'
        },
        {
            id: 'advanced',
            title: 'Advanced Usage',
            subtitle: 'Advanced',
            path: 'advanced'
        }
    ];

    constructor() {}

    ngOnInit() {}
}
