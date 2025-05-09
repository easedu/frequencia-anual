import { StylesConfig } from "react-select";
import { SelectOption } from "../interfaces";

export const customSelectStyles: StylesConfig<SelectOption, true> = {
    control: (provided) => ({
        ...provided,
        borderColor: "hsl(var(--input))",
        borderRadius: "0.375rem",
        padding: "0.25rem",
        backgroundColor: "hsl(var(--background))",
        "&:hover": {
            borderColor: "hsl(var(--primary))",
        },
    }),
    menu: (provided) => ({
        ...provided,
        backgroundColor: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.375rem",
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected
            ? "hsl(var(--primary))"
            : state.isFocused
                ? "hsl(var(--primary)/0.1)"
                : "hsl(var(--background))",
        color: state.isSelected ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
        "&:hover": {
            backgroundColor: "hsl(var(--primary)/0.1)",
        },
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: "hsl(var(--primary)/0.1)",
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: "hsl(var(--foreground))",
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: "hsl(var(--foreground))",
        "&:hover": {
            backgroundColor: "hsl(var(--destructive))",
            color: "hsl(var(--destructive-foreground))",
        },
    }),
};