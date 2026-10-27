import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormsModule } from "@angular/forms";

export interface BusinessProfileChanges {
  companyName: string;
  businessType: "retail" | "restaurant";
}

@Component({
  selector: "app-business-profile-section",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./business-profile-section.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessProfileSectionComponent implements OnChanges {
  @Input() companyName = "";
  @Input() businessType: BusinessProfileChanges["businessType"] = "retail";
  @Input() saving = false;

  @Output() saveChanges = new EventEmitter<BusinessProfileChanges>();

  name = "";
  type: BusinessProfileChanges["businessType"] = "retail";

  ngOnChanges(_changes: SimpleChanges): void {
    this.name = this.companyName;
    this.type = this.businessType;
  }

  submit(): void {
    this.saveChanges.emit({
      companyName: this.name.trim(),
      businessType: this.type,
    });
  }
}
