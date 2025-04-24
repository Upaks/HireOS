import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Interview, Evaluation } from "@/types";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface EvaluationFormProps {
  interview: Interview;
  existingEvaluation?: Evaluation;
  onComplete?: () => void;
}

const evaluationSchema = z.object({
  technicalScore: z.string().optional(),
  communicationScore: z.string().optional(),
  problemSolvingScore: z.string().optional(),
  culturalFitScore: z.string().optional(),
  overallRating: z.string({ required_error: "Please select a recommendation" }),
  technicalComments: z.string().optional(),
  communicationComments: z.string().optional(),
  problemSolvingComments: z.string().optional(),
  culturalFitComments: z.string().optional(),
  overallComments: z.string().optional(),
});

export default function EvaluationForm({ 
  interview, 
  existingEvaluation,
  onComplete 
}: EvaluationFormProps) {
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof evaluationSchema>>({
    resolver: zodResolver(evaluationSchema),
    defaultValues: {
      technicalScore: existingEvaluation?.technicalScore?.toString() || "",
      communicationScore: existingEvaluation?.communicationScore?.toString() || "",
      problemSolvingScore: existingEvaluation?.problemSolvingScore?.toString() || "",
      culturalFitScore: existingEvaluation?.culturalFitScore?.toString() || "",
      overallRating: existingEvaluation?.overallRating || "",
      technicalComments: existingEvaluation?.technicalComments || "",
      communicationComments: existingEvaluation?.communicationComments || "",
      problemSolvingComments: existingEvaluation?.problemSolvingComments || "",
      culturalFitComments: existingEvaluation?.culturalFitComments || "",
      overallComments: existingEvaluation?.overallComments || "",
    }
  });
  
  const submitEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert string scores to numbers
      const formattedData = {
        ...data,
        technicalScore: data.technicalScore ? parseInt(data.technicalScore, 10) : undefined,
        communicationScore: data.communicationScore ? parseInt(data.communicationScore, 10) : undefined,
        problemSolvingScore: data.problemSolvingScore ? parseInt(data.problemSolvingScore, 10) : undefined,
        culturalFitScore: data.culturalFitScore ? parseInt(data.culturalFitScore, 10) : undefined,
      };
      
      const res = await apiRequest(
        "POST", 
        `/api/interviews/${interview.id}/evaluate`, 
        formattedData
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/interviews'] });
      queryClient.invalidateQueries({ queryKey: [`/api/interviews/${interview.id}/evaluation`] });
      
      toast({
        title: "Evaluation submitted",
        description: `Your evaluation for ${interview.candidate?.name} has been saved.`
      });
      
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit evaluation",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: z.infer<typeof evaluationSchema>) => {
    submitEvaluationMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Technical Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="technicalScore"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <Label className="sr-only">Rating</Label>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex items-center"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="1" id="tech-1" />
                        <Label htmlFor="tech-1" className="ml-2 mr-4">1</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="2" id="tech-2" />
                        <Label htmlFor="tech-2" className="ml-2 mr-4">2</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="3" id="tech-3" />
                        <Label htmlFor="tech-3" className="ml-2 mr-4">3</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="4" id="tech-4" />
                        <Label htmlFor="tech-4" className="ml-2 mr-4">4</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="5" id="tech-5" />
                        <Label htmlFor="tech-5" className="ml-2">5</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="technicalComments"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Textarea
                      placeholder="Comments on technical skills..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Communication</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="communicationScore"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <Label className="sr-only">Rating</Label>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex items-center"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="1" id="comm-1" />
                        <Label htmlFor="comm-1" className="ml-2 mr-4">1</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="2" id="comm-2" />
                        <Label htmlFor="comm-2" className="ml-2 mr-4">2</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="3" id="comm-3" />
                        <Label htmlFor="comm-3" className="ml-2 mr-4">3</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="4" id="comm-4" />
                        <Label htmlFor="comm-4" className="ml-2 mr-4">4</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="5" id="comm-5" />
                        <Label htmlFor="comm-5" className="ml-2">5</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="communicationComments"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Textarea
                      placeholder="Comments on communication..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Problem Solving</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="problemSolvingScore"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <Label className="sr-only">Rating</Label>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex items-center"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="1" id="prob-1" />
                        <Label htmlFor="prob-1" className="ml-2 mr-4">1</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="2" id="prob-2" />
                        <Label htmlFor="prob-2" className="ml-2 mr-4">2</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="3" id="prob-3" />
                        <Label htmlFor="prob-3" className="ml-2 mr-4">3</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="4" id="prob-4" />
                        <Label htmlFor="prob-4" className="ml-2 mr-4">4</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="5" id="prob-5" />
                        <Label htmlFor="prob-5" className="ml-2">5</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="problemSolvingComments"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Textarea
                      placeholder="Comments on problem solving..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cultural Fit</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="culturalFitScore"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-1">
                    <Label className="sr-only">Rating</Label>
                    <RadioGroup 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      className="flex items-center"
                    >
                      <div className="flex items-center">
                        <RadioGroupItem value="1" id="cult-1" />
                        <Label htmlFor="cult-1" className="ml-2 mr-4">1</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="2" id="cult-2" />
                        <Label htmlFor="cult-2" className="ml-2 mr-4">2</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="3" id="cult-3" />
                        <Label htmlFor="cult-3" className="ml-2 mr-4">3</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="4" id="cult-4" />
                        <Label htmlFor="cult-4" className="ml-2 mr-4">4</Label>
                      </div>
                      <div className="flex items-center">
                        <RadioGroupItem value="5" id="cult-5" />
                        <Label htmlFor="cult-5" className="ml-2">5</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="culturalFitComments"
              render={({ field }) => (
                <FormItem className="mt-2">
                  <FormControl>
                    <Textarea
                      placeholder="Comments on cultural fit..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Overall Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="overallComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Overall Comments</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Your overall assessment of the candidate..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="overallRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recommendation</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a recommendation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                      <SelectItem value="Hire">Hire</SelectItem>
                      <SelectItem value="Neutral">Neutral</SelectItem>
                      <SelectItem value="Do Not Hire">Do Not Hire</SelectItem>
                      <SelectItem value="Strong Do Not Hire">Strong Do Not Hire</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              disabled={submitEvaluationMutation.isPending}
            >
              {submitEvaluationMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Evaluation"
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
